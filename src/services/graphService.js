const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
const config = require('../config');

class GraphService {
  constructor() {
    this.clients = {};
    this.initializeClients();
  }

  initializeClients() {
    Object.entries(config.dexSubgraphs).forEach(([dexName, dexConfig]) => {
      this.clients[dexName] = new ApolloClient({
        uri: dexConfig.url,
        cache: new InMemoryCache(),
        fetch,
        headers: config.theGraphApiKey ? {
          'Authorization': `Bearer ${config.theGraphApiKey}`
        } : {}
      });
    });
  }

  // Query para Uniswap V3 Polygon
  getUniswapV3PoolsQuery() {
    return gql`
      query Pools($tokens: [String!], $minLiquidity: String) {
        pools(
          where: { 
            token0_in: $tokens, 
            token1_in: $tokens, 
            totalValueLockedUSD_gt: $minLiquidity 
          }, 
          first: 100,
          orderBy: totalValueLockedUSD,
          orderDirection: desc
        ) {
          id
          token0 { 
            id
            symbol 
            decimals
          }
          token1 { 
            id
            symbol 
            decimals
          }
          totalValueLockedUSD
          volumeUSD
          sqrtPrice
          tick
          feeTier
          token0Price
          token1Price
        }
      }
    `;
  }

  // Query para SushiSwap e QuickSwap (sem feeTier)
  getPoolsQuery() {
    return gql`
      query Pools($tokens: [String!], $minLiquidity: String) {
        pools(
          where: { 
            token0_in: $tokens, 
            token1_in: $tokens, 
            totalValueLockedUSD_gt: $minLiquidity 
          }, 
          first: 100,
          orderBy: totalValueLockedUSD,
          orderDirection: desc
        ) {
          id
          token0 {
            id
            symbol
            decimals
          }
          token1 {
            id
            symbol
            decimals
          }
          totalValueLockedUSD
          volumeUSD
          token0Price
          token1Price
        }
      }
    `;
  }

  // Função para detectar automaticamente o campo de pools
  async detectPoolField(client, dexName, validTokenAddresses, minLiquidity) {
    const candidateFields = [
      'pools',
      'pairs',
      'liquidityPools',
      'swapPairs',
      'poolList',
      'pool',
      'pair',
    ];
    for (const field of candidateFields) {
      const query = gql`
        query TestField($tokens: [String!], $minLiquidity: String) {
          ${field}(
            first: 1
          ) {
            id
          }
        }
      `;
      try {
        const { data } = await client.query({
          query,
          variables: { tokens: validTokenAddresses, minLiquidity },
          fetchPolicy: 'no-cache',
        });
        if (data && data[field]) {
          console.log(`✅ Campo '${field}' encontrado para ${dexName}`);
          return field;
        }
      } catch (e) {
        // Ignorar erro
      }
    }
    console.error(`❌ Nenhum campo de pools encontrado para ${dexName}`);
    return null;
  }

  // Query dinâmica para pools
  getDynamicPoolsQuery(field) {
    return gql`
      query Pools($tokens: [String!], $minLiquidity: String) {
        ${field}(
          first: 100
        ) {
          id
        }
      }
    `;
  }

  // Obter dados de todos os pools das DEXs
  async getAllPoolsData() {
    const allPools = {};
    
    // Debug: verificar tokens configurados
    console.log('🔍 Verificando tokens configurados...');
    Object.entries(config.tokens).forEach(([name, token]) => {
      console.log(`   ${name}: ${token.address || 'UNDEFINED'}`);
    });
    
    const tokenAddresses = Object.values(config.tokens).map(token => token.address);
    
    // Debug: verificar endereços filtrados
    console.log('🔍 Endereços de tokens para query:');
    console.log(tokenAddresses);
    
    // Filtrar endereços undefined/null
    const validTokenAddresses = tokenAddresses.filter(addr => addr && addr !== 'undefined');
    
    if (validTokenAddresses.length === 0) {
      console.error('❌ Nenhum endereço de token válido encontrado!');
      return allPools;
    }
    
    console.log(`✅ ${validTokenAddresses.length} endereços válidos encontrados`);
    
    const minLiquidity = '100000'; // $100k em liquidez mínima

    for (const [dexName, client] of Object.entries(this.clients)) {
      try {
        console.log(`Consultando pools da ${config.dexSubgraphs[dexName].name}...`);
        let query;
        if (dexName === 'uniswap') {
          query = this.getUniswapV3PoolsQuery();
        } else {
          query = this.getPoolsQuery();
        }
        const { data } = await client.query({
          query: query,
          variables: { 
            tokens: validTokenAddresses,
            minLiquidity 
          },
          fetchPolicy: 'no-cache'
        });
        // Extrair pools
        let pools = [];
        if (data) {
          pools = data.pools || [];
        }
        allPools[dexName] = pools.map(pool => ({
          ...pool,
          dex: dexName,
          dexName: config.dexSubgraphs[dexName].name
        }));
        console.log(`✓ ${pools.length} pools encontrados na ${config.dexSubgraphs[dexName].name}`);
      } catch (error) {
        console.error(`Erro ao consultar ${dexName}:`, error.message);
        allPools[dexName] = [];
      }
    }
    return allPools;
  }

  // Calcular preço de um pool (adaptado para diferentes formatos)
  calculatePoolPrice(pool) {
    try {
      // Para Uniswap V3 - tentar múltiplos métodos
      if (pool.token0 && pool.token1) {
        const token0Decimals = parseInt(pool.token0.decimals);
        const token1Decimals = parseInt(pool.token1.decimals);
        
        // Validação básica dos decimais
        if (isNaN(token0Decimals) || isNaN(token1Decimals)) {
          console.warn(`⚠️ Decimais inválidos para pool ${pool.id}: token0=${token0Decimals}, token1=${token1Decimals}`);
          return null;
        }
        
        let adjustedPrice = null;
        let calculationMethod = 'unknown';
        
        // MÉTODO 1: Priorizar token0Price/token1Price (mais confiável para Uniswap V3)
        if (pool.token0Price && parseFloat(pool.token0Price) > 0) {
          const price = parseFloat(pool.token0Price);
          if (isFinite(price) && price > 0 && price < 1e10 && price > 1e-10) { // Validação adicional de range
            adjustedPrice = price;
            calculationMethod = 'token0Price';
          }
        }
        
        // MÉTODO 2: Tentar token1Price como alternativa
        if (!adjustedPrice && pool.token1Price && parseFloat(pool.token1Price) > 0) {
          const price = 1 / parseFloat(pool.token1Price); // Inverso de token1Price
          if (isFinite(price) && price > 0 && price < 1e10 && price > 1e-10) {
            adjustedPrice = price;
            calculationMethod = 'token1Price_inverse';
          }
        }
        
        // MÉTODO 3: sqrtPrice apenas como último recurso (pode ter problemas)
        if (!adjustedPrice && pool.sqrtPrice) {
          const sqrtPrice = parseFloat(pool.sqrtPrice);
          
          // Validação do sqrtPrice
          if (sqrtPrice > 0 && isFinite(sqrtPrice)) {
            try {
              // Método 2a: Cálculo com BigInt para evitar overflow
              const sqrtPriceBigInt = BigInt(Math.floor(sqrtPrice));
              const Q96 = BigInt(2) ** BigInt(96);
              
              // Calcular preço: (sqrtPrice / 2^96)^2
              const numerator = sqrtPriceBigInt * sqrtPriceBigInt;
              const denominator = Q96 * Q96;
              
              // Ajustar por decimais dos tokens
              const decimalAdjustment = BigInt(10) ** BigInt(token1Decimals - token0Decimals);
              const priceBigInt = (numerator * decimalAdjustment) / denominator;
              
              // Converter para número com escala apropriada
              const calculatedPrice = Number(priceBigInt) / Math.pow(10, token1Decimals);
              
              // Verificar se o resultado é válido
              if (isFinite(calculatedPrice) && calculatedPrice > 0) {
                adjustedPrice = calculatedPrice;
              }
              
            } catch (error) {
              console.warn(`⚠️ Método BigInt falhou para pool ${pool.id}:`, error.message);
              
              // Método 2b: Fórmula simplificada como fallback
              try {
                const normalizedSqrtPrice = sqrtPrice / Math.pow(2, 96);
                const basePrice = normalizedSqrtPrice * normalizedSqrtPrice;
                const calculatedPrice = basePrice * Math.pow(10, token1Decimals - token0Decimals);
                
                if (isFinite(calculatedPrice) && calculatedPrice > 0) {
                  adjustedPrice = calculatedPrice;
                }
                
              } catch (altError) {
                console.warn(`⚠️ Método alternativo falhou para pool ${pool.id}:`, altError.message);
              }
            }
          }
        }
        
        // Se nenhum método funcionou, retornar null
        if (!adjustedPrice || adjustedPrice <= 0 || !isFinite(adjustedPrice)) {
          console.warn(`⚠️ Não foi possível calcular preço válido para pool ${pool.id}`);
          console.warn(`   Métodos tentados: token0Price=${pool.token0Price}, token1Price=${pool.token1Price}, sqrtPrice=${pool.sqrtPrice}`);
          return null;
        }
        
        // Log do método usado (apenas para debug inicial)
        if (Math.random() < 0.1) { // 10% dos pools para não spammar
          console.log(`💰 Pool ${pool.id} (${pool.token0?.symbol}/${pool.token1?.symbol}): preço=${adjustedPrice.toFixed(8)} via ${calculationMethod}`);
        }
        
        const inversePrice = 1 / adjustedPrice;
        
        // Validação do preço inverso
        if (inversePrice <= 0 || !isFinite(inversePrice)) {
          console.warn(`⚠️ Preço inverso inválido para pool ${pool.id}: ${inversePrice}`);
          return null;
        }
        
        const liquidity = parseFloat(pool.totalValueLockedUSD || '0');
        const volumeUSD = parseFloat(pool.volumeUSD || '0');
        
        // Validar liquidez mínima usando filtros aprimorados
        const minLiquidity = config.qualityFilters?.minLiquidityUSD || 50000;
        if (liquidity < minLiquidity) {
          console.warn(`⚠️ Liquidez muito baixa para pool ${pool.id}: $${liquidity} (mín: $${minLiquidity})`);
          return null;
        }
        
        // Validar volume mínimo se disponível
        const minVolume = config.qualityFilters?.minVolume24hUSD || 10000;
        if (volumeUSD > 0 && volumeUSD < minVolume) {
          console.warn(`⚠️ Volume muito baixo para pool ${pool.id}: $${volumeUSD} (mín: $${minVolume})`);
          return null;
        }
        
        return {
          token0Symbol: pool.token0.symbol,
          token1Symbol: pool.token1.symbol,
          price: adjustedPrice,
          inversePrice: inversePrice,
          liquidity: liquidity,
          volumeUSD: volumeUSD,
          tvlUSD: liquidity,
          isValid: true,
          dex: pool.dex || 'unknown',
          poolId: pool.id
        };
      }
      
      // Para SushiSwap e QuickSwap (pools format)
      if (pool.token0 && pool.token1 && pool.token0Price) {
        const price = parseFloat(pool.token0Price);
        
        // Validação básica
        if (price <= 0 || isNaN(price) || !isFinite(price)) {
          console.warn(`⚠️ token0Price inválido para pool ${pool.id}: ${price}`);
          return null;
        }
        
        const inversePrice = 1 / price;
        const liquidity = parseFloat(pool.totalValueLockedUSD || '0');
        const volumeUSD = parseFloat(pool.volumeUSD || '0');
        
        // Validar liquidez mínima usando filtros aprimorados
        const minLiquidity = config.qualityFilters?.minLiquidityUSD || 50000;
        if (liquidity < minLiquidity) {
          console.warn(`⚠️ Liquidez muito baixa para pool ${pool.id}: $${liquidity} (mín: $${minLiquidity})`);
          return null;
        }
        
        // Validar volume mínimo se disponível
        const minVolume = config.qualityFilters?.minVolume24hUSD || 10000;
        if (volumeUSD > 0 && volumeUSD < minVolume) {
          console.warn(`⚠️ Volume muito baixo para pool ${pool.id}: $${volumeUSD} (mín: $${minVolume})`);
          return null;
        }
        
        return {
          token0Symbol: pool.token0.symbol,
          token1Symbol: pool.token1.symbol,
          price: price,
          inversePrice: inversePrice,
          liquidity: liquidity,
          volumeUSD: volumeUSD,
          tvlUSD: liquidity,
          isValid: true,
          dex: pool.dex || 'unknown',
          poolId: pool.id
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao calcular preço do pool:', error);
      return null;
    }
  }

  // Validar dados de mercado globalmente
  validateMarketData(tokenPrices) {
    const stats = {
      totalPairs: 0,
      validPairs: 0,
      invalidPairs: 0,
      averageSpread: 0,
      maxSpread: 0,
      suspiciousPairs: [],
      qualityScore: 0
    };

    const allSpreads = [];

    for (const [pair, dexPrices] of Object.entries(tokenPrices)) {
      stats.totalPairs++;
      
      const prices = Object.values(dexPrices).filter(p => p > 0 && isFinite(p));
      
      if (prices.length < 2) {
        stats.invalidPairs++;
        continue;
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const spread = (maxPrice - minPrice) / minPrice * 100;

      allSpreads.push(spread);

      if (spread > 10) { // Mais de 10% é suspeito
        stats.suspiciousPairs.push({
          pair,
          spread: spread.toFixed(4),
          prices: dexPrices,
          priceRange: `${minPrice.toFixed(6)} - ${maxPrice.toFixed(6)}`
        });
      } else {
        stats.validPairs++;
      }

      stats.maxSpread = Math.max(stats.maxSpread, spread);
    }

    stats.averageSpread = allSpreads.length > 0 ?
      (allSpreads.reduce((a, b) => a + b, 0) / allSpreads.length) : 0;
    
    stats.qualityScore = stats.totalPairs > 0 ?
      (stats.validPairs / stats.totalPairs * 100) : 0;

    return stats;
  }

  // Processar dados dos pools e extrair preços
  processPoolsData(poolsData) {
    const tokenPrices = {};
    const processedPools = [];
    let validPoolsCount = 0;
    let invalidPoolsCount = 0;

    Object.entries(poolsData).forEach(([dexName, pools]) => {
      console.log(`🔍 Processando ${pools.length} pools da ${dexName}...`);
      
      pools.forEach(pool => {
        const priceData = this.calculatePoolPrice(pool);
        if (priceData && priceData.isValid) {
          validPoolsCount++;
          
          const pairKey = `${priceData.token0Symbol}/${priceData.token1Symbol}`;
          const reversePairKey = `${priceData.token1Symbol}/${priceData.token0Symbol}`;
          
          // Armazenar preço
          if (!tokenPrices[pairKey]) {
            tokenPrices[pairKey] = {};
          }
          tokenPrices[pairKey][dexName] = priceData.price;
          
          // Armazenar preço inverso
          if (!tokenPrices[reversePairKey]) {
            tokenPrices[reversePairKey] = {};
          }
          tokenPrices[reversePairKey][dexName] = priceData.inversePrice;
          
          // Adicionar pool processado
          processedPools.push({
            ...pool,
            priceData,
            pairKey,
            reversePairKey
          });
        } else {
          invalidPoolsCount++;
        }
      });
    });

    // Validar dados de mercado
    const marketStats = this.validateMarketData(tokenPrices);
    
    console.log(`📊 Estatísticas de processamento:`);
    console.log(`   Pools válidos: ${validPoolsCount}`);
    console.log(`   Pools inválidos: ${invalidPoolsCount}`);
    console.log(`   Pares de tokens: ${marketStats.totalPairs}`);
    console.log(`   Pares válidos: ${marketStats.validPairs}`);
    console.log(`   Score de qualidade: ${marketStats.qualityScore.toFixed(1)}%`);
    console.log(`   Spread médio: ${marketStats.averageSpread.toFixed(4)}%`);
    console.log(`   Spread máximo: ${marketStats.maxSpread.toFixed(4)}%`);
    
    if (marketStats.suspiciousPairs.length > 0) {
      console.log(`⚠️  ${marketStats.suspiciousPairs.length} pares suspeitos encontrados:`);
      marketStats.suspiciousPairs.slice(0, 5).forEach(pair => {
        console.log(`   ${pair.pair}: spread ${pair.spread}% (${pair.priceRange})`);
      });
    }

    return {
      tokenPrices,
      processedPools,
      timestamp: Date.now(),
      stats: {
        validPools: validPoolsCount,
        invalidPools: invalidPoolsCount,
        marketStats
      }
    };
  }

  // Obter dados atualizados de todas as DEXs
  async getUpdatedData() {
    try {
      console.log('🔄 Atualizando dados das DEXs...');
      const poolsData = await this.getAllPoolsData();
      const processedData = this.processPoolsData(poolsData);
      
      console.log(`✓ Dados atualizados: ${processedData.processedPools.length} pools processados`);
      return processedData;
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      throw error;
    }
  }
}

module.exports = GraphService; 