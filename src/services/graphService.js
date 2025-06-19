const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
const config = require('../config');

class GraphService {
  constructor() {
    this.clients = {};
    this.initializeClients();
  }
  
  // Força reinicialização dos clientes (para debugging)
  reinitializeClients() {
    console.log('🔄 Forçando reinicialização dos clientes GraphQL...');
    this.clients = {};
    this.initializeClients();
  }

  initializeClients() {
    console.log('🔧 Inicializando clientes GraphQL...');
    console.log(`   API Key presente: ${config.theGraphApiKey ? 'SIM' : 'NÃO'}`);
    if (config.theGraphApiKey) {
      console.log(`   API Key (primeiros 8 chars): ${config.theGraphApiKey.substring(0, 8)}...`);
    }
    
    Object.entries(config.dexSubgraphs).forEach(([dexName, dexConfig]) => {
      const headers = config.theGraphApiKey ? {
        'Authorization': `Bearer ${config.theGraphApiKey}`
      } : {};
      
      console.log(`   Configurando cliente ${dexName}:`);
      console.log(`     URL: ${dexConfig.url}`);
      console.log(`     Headers: ${JSON.stringify(headers)}`);
      
      this.clients[dexName] = new ApolloClient({
        uri: dexConfig.url,
        cache: new InMemoryCache(),
        fetch,
        headers: headers,
        defaultOptions: {
          query: {
            fetchPolicy: 'no-cache'
          }
        }
      });
    });
    
    console.log(`✅ ${Object.keys(this.clients).length} clientes GraphQL inicializados`);
  }

  // Query para Uniswap V3 (sem feeTier que causava erro no QuickSwap)
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
          token0Price
          token1Price
        }
      }
    `;
  }

  // Query para Balancer V2
  getBalancerPoolsQuery() {
    return gql`
      query Pools($tokens: [String!], $minLiquidity: String) {
        pools(
          where: {
            tokensList_contains: $tokens,
            totalLiquidity_gt: $minLiquidity
          },
          first: 100,
          orderBy: totalLiquidity,
          orderDirection: desc
        ) {
          id
          tokens {
            address
            symbol
            decimals
            balance
            weight
          }
          totalLiquidity
          totalSwapVolume
          swapFee
          poolType
        }
      }
    `;
  }

  // Query padronizada para pools (SushiSwap e QuickSwap)
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
    
    // CORREÇÃO: Força reinicialização dos clientes para garantir URLs corretas
    this.reinitializeClients();
    
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
        const dexConfig = config.dexSubgraphs[dexName];
        console.log(`Consultando pools da ${dexConfig.name}...`);
        
        let query;
        let variables = {
          tokens: validTokenAddresses,
          minLiquidity
        };

        // Escolher query baseada no tipo da DEX
        if (dexConfig.type === 'uniswap_v3_style') {
          query = this.getUniswapV3PoolsQuery();
        } else if (dexConfig.type === 'balancer_style') {
          query = this.getBalancerPoolsQuery();
        } else {
          // Fallback para query padrão
          query = this.getPoolsQuery();
        }

        const { data } = await client.query({
          query: query,
          variables: variables,
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
          dexName: dexConfig.name,
          dexType: dexConfig.type || 'standard'
        }));

        console.log(`✓ ${pools.length} pools encontrados na ${dexConfig.name}`);
        
        // Log de exemplo de pool real para confirmar dados
        if (pools.length > 0) {
          const firstPool = pools[0];
          console.log(`   Exemplo: ID ${firstPool.id?.substring(0, 12)}... com TVL $${parseFloat(firstPool.totalValueLockedUSD || firstPool.totalLiquidity || 0).toLocaleString()}`);
        }

      } catch (error) {
        console.error(`Erro ao consultar ${dexName}:`, error.message);
        allPools[dexName] = [];
      }
    }
    // MUDANÇA CRÍTICA: Só usar simulação se TODOS os endpoints falharam E não há dados reais
    const totalRealPools = Object.values(allPools).reduce((sum, pools) => sum + pools.length, 0);
    const hasRealBlockchainData = totalRealPools > 0 && Object.values(allPools).some(pools =>
      pools.some(pool => pool.id && pool.id.length > 20 && pool.id.startsWith('0x'))
    );

    if (!hasRealBlockchainData && totalRealPools === 0) {
      console.log('⚠️  ATENÇÃO: Todos os endpoints falharam, usando dados simulados temporariamente...');
      console.log('   Para dados REAIS, verifique se THE_GRAPH_API_KEY está configurada corretamente');
      return this.getSimulatedPoolsData();
    } else if (hasRealBlockchainData) {
      console.log(`✅ DADOS REAIS CONFIRMADOS: ${totalRealPools} pools reais encontrados!`);
    }
    
    return allPools;
  }

  // Gerar dados simulados para demonstração
  getSimulatedPoolsData() {
    const simulatedPools = {
      sushiswap: [
        {
          id: '0x1',
          token0: { id: config.tokens.USDC.address, symbol: 'USDC', decimals: 6 },
          token1: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          totalValueLockedUSD: '250000',
          volumeUSD: '15000',
          token0Price: '0.0003125',
          token1Price: '3200',
          dex: 'sushiswap',
          dexName: 'SushiSwap'
        },
        {
          id: '0x2',
          token0: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          token1: { id: config.tokens.WMATIC.address, symbol: 'WMATIC', decimals: 18 },
          totalValueLockedUSD: '180000',
          volumeUSD: '12000',
          token0Price: '4.8',
          token1Price: '0.208',
          dex: 'sushiswap',
          dexName: 'SushiSwap'
        },
        {
          id: '0x3',
          token0: { id: config.tokens.USDC.address, symbol: 'USDC', decimals: 6 },
          token1: { id: config.tokens.WMATIC.address, symbol: 'WMATIC', decimals: 18 },
          totalValueLockedUSD: '320000',
          volumeUSD: '18000',
          token0Price: '1.49',
          token1Price: '0.671',
          dex: 'sushiswap',
          dexName: 'SushiSwap'
        },
        {
          id: '0x4',
          token0: { id: config.tokens.AAVE.address, symbol: 'AAVE', decimals: 18 },
          token1: { id: config.tokens.USDT.address, symbol: 'USDT', decimals: 6 },
          totalValueLockedUSD: '150000',
          volumeUSD: '8000',
          token0Price: '0.0065',
          token1Price: '153.8',
          dex: 'sushiswap',
          dexName: 'SushiSwap'
        },
        {
          id: '0x5',
          token0: { id: config.tokens.AAVE.address, symbol: 'AAVE', decimals: 18 },
          token1: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          totalValueLockedUSD: '200000',
          volumeUSD: '10000',
          token0Price: '0.048',
          token1Price: '20.8',
          dex: 'sushiswap',
          dexName: 'SushiSwap'
        }
      ],
      quickswap: [
        {
          id: '0x6',
          token0: { id: config.tokens.USDC.address, symbol: 'USDC', decimals: 6 },
          token1: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          totalValueLockedUSD: '280000',
          volumeUSD: '16000',
          token0Price: '0.0003115',
          token1Price: '3210',
          dex: 'quickswap',
          dexName: 'QuickSwap V3'
        },
        {
          id: '0x7',
          token0: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          token1: { id: config.tokens.WMATIC.address, symbol: 'WMATIC', decimals: 18 },
          totalValueLockedUSD: '190000',
          volumeUSD: '11000',
          token0Price: '4.77',
          token1Price: '0.2096',
          dex: 'quickswap',
          dexName: 'QuickSwap V3'
        },
        {
          id: '0x8',
          token0: { id: config.tokens.USDC.address, symbol: 'USDC', decimals: 6 },
          token1: { id: config.tokens.WMATIC.address, symbol: 'WMATIC', decimals: 18 },
          totalValueLockedUSD: '300000',
          volumeUSD: '17000',
          token0Price: '1.487',
          token1Price: '0.6725',
          dex: 'quickswap',
          dexName: 'QuickSwap V3'
        },
        {
          id: '0x9',
          token0: { id: config.tokens.AAVE.address, symbol: 'AAVE', decimals: 18 },
          token1: { id: config.tokens.USDT.address, symbol: 'USDT', decimals: 6 },
          totalValueLockedUSD: '160000',
          volumeUSD: '9000',
          token0Price: '0.00652',
          token1Price: '153.4',
          dex: 'quickswap',
          dexName: 'QuickSwap V3'
        },
        {
          id: '0x10',
          token0: { id: config.tokens.AAVE.address, symbol: 'AAVE', decimals: 18 },
          token1: { id: config.tokens.WETH.address, symbol: 'WETH', decimals: 18 },
          totalValueLockedUSD: '220000',
          volumeUSD: '12000',
          token0Price: '0.0479',
          token1Price: '20.88',
          dex: 'quickswap',
          dexName: 'QuickSwap V3'
        }
      ]
    };
    
    console.log('✅ Dados simulados gerados com sucesso');
    console.log(`📊 Total de pools simulados: ${Object.values(simulatedPools).flat().length}`);
    
    return simulatedPools;
  }

  // Calcular preços de pools Balancer (múltiplos tokens)
  calculateBalancerPoolPrice(pool) {
    try {
      if (!pool.tokens || pool.tokens.length < 2) {
        return null;
      }

      const liquidity = parseFloat(pool.totalLiquidity || '0');
      const volumeUSD = parseFloat(pool.totalSwapVolume || '0');
      
      // Validar liquidez mínima
      const minLiquidity = config.qualityFilters?.minLiquidityUSD || 50000;
      if (liquidity < minLiquidity) {
        return null;
      }

      // Encontrar par de tokens conhecidos para calcular preço
      const knownTokens = ['USDC', 'WETH', 'WMATIC', 'USDT', 'DAI'];
      const poolTokens = pool.tokens.filter(token =>
        knownTokens.includes(token.symbol) &&
        parseFloat(token.balance || 0) > 0
      );

      if (poolTokens.length < 2) {
        return null;
      }

      // Pegar os dois primeiros tokens com maior balance
      poolTokens.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
      const token0 = poolTokens[0];
      const token1 = poolTokens[1];

      const balance0 = parseFloat(token0.balance);
      const balance1 = parseFloat(token1.balance);
      const weight0 = parseFloat(token0.weight || 0.5);
      const weight1 = parseFloat(token1.weight || 0.5);

      if (balance0 <= 0 || balance1 <= 0 || weight0 <= 0 || weight1 <= 0) {
        return null;
      }

      // Calcular preço usando weighted balances
      // price = (balance1 / balance0) * (weight0 / weight1)
      const price = (balance1 / balance0) * (weight0 / weight1);
      
      if (!isFinite(price) || price <= 0) {
        return null;
      }

      return {
        token0Symbol: token0.symbol,
        token1Symbol: token1.symbol,
        price: price,
        inversePrice: 1 / price,
        liquidity: liquidity,
        volumeUSD: volumeUSD,
        tvlUSD: liquidity,
        isValid: true,
        dex: pool.dex || 'balancer',
        poolId: pool.id,
        poolType: pool.poolType || 'weighted',
        tokenCount: pool.tokens.length
      };
    } catch (error) {
      console.warn('Erro no cálculo Balancer:', error.message);
      return null;
    }
  }

  // Função para cálculo correto de preços Uniswap V3
  calculateUniswapV3Price(sqrtPriceX96, decimals0, decimals1, isToken0Base = true) {
    try {
      if (!sqrtPriceX96 || sqrtPriceX96 === '0') {
        return null;
      }

      const sqrtPrice = BigInt(sqrtPriceX96);
      const divisor = 2n ** 96n;
      
      // Calcular preço: (sqrtPrice / 2^96)^2
      const price = (sqrtPrice * sqrtPrice * 10n ** BigInt(decimals1 - decimals0)) / (divisor * divisor);
      
      // Converter para número com validação
      const finalPrice = isToken0Base ?
        Number(price) / 10 ** decimals1 :
        1 / (Number(price) / 10 ** decimals1);
      
      // Validar resultado
      if (!isFinite(finalPrice) || finalPrice <= 0) {
        return null;
      }
      
      return finalPrice;
    } catch (error) {
      console.warn('Erro no cálculo Uniswap V3:', error.message);
      return null;
    }
  }

  // Função para cálculo de preços QuickSwap
  calculateQuickSwapPrice(token0Price) {
    try {
      if (!token0Price || token0Price === '0') {
        return null;
      }
      
      const price = parseFloat(token0Price);
      
      // Validar resultado
      if (!isFinite(price) || price <= 0) {
        return null;
      }
      
      return price;
    } catch (error) {
      console.warn('Erro no cálculo QuickSwap:', error.message);
      return null;
    }
  }

  // Calcular preço de um pool (adaptado para diferentes formatos)
  calculatePoolPrice(pool) {
    try {
      // Para pools Balancer (múltiplos tokens)
      if (pool.dexType === 'balancer_style' && pool.tokens && pool.tokens.length >= 2) {
        return this.calculateBalancerPoolPrice(pool);
      }

      // Para Uniswap V3 style - tentar múltiplos métodos
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
        
        // MÉTODO 1: Priorizar token0Price/token1Price (mais confiável para todos os pools)
        if (!adjustedPrice && pool.token0Price && parseFloat(pool.token0Price) > 0) {
          if (pool.dex === 'quickswap') {
            adjustedPrice = this.calculateQuickSwapPrice(pool.token0Price);
            if (adjustedPrice) {
              calculationMethod = 'quickswap_token0Price';
            }
          } else {
            const price = parseFloat(pool.token0Price);
            if (isFinite(price) && price > 0 && price < 1e10 && price > 1e-10) {
              adjustedPrice = price;
              calculationMethod = 'token0Price';
            }
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
        
        // MÉTODO 3: sqrtPrice (para Uniswap V3) como último recurso
        if (!adjustedPrice && pool.sqrtPrice) {
          const sqrtPrice = parseFloat(pool.sqrtPrice);
          
          // Validação do sqrtPrice
          if (sqrtPrice > 0 && isFinite(sqrtPrice)) {
            try {
              // Método legacy simplificado
              const normalizedSqrtPrice = sqrtPrice / Math.pow(2, 96);
              const basePrice = normalizedSqrtPrice * normalizedSqrtPrice;
              const calculatedPrice = basePrice * Math.pow(10, token1Decimals - token0Decimals);
              
              if (isFinite(calculatedPrice) && calculatedPrice > 0) {
                adjustedPrice = calculatedPrice;
                calculationMethod = 'legacy_sqrtPrice';
              }
            } catch (error) {
              console.warn(`⚠️ Cálculo legacy falhou para pool ${pool.id}:`, error.message);
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