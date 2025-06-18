const GraphService = require('../src/services/graphService');

async function debugSpreads() {
  console.log('🔍 Sprint 3 - Fase 3.1: Debug Profundo dos Spreads\n');

  const graphService = new GraphService();

  try {
    console.log('📊 Passo 1: Buscar dados reais das DEXs...');
    const poolsData = await graphService.getAllPoolsData();
    
    console.log('\n📊 Passo 2: Analisar dados brutos por DEX...');
    Object.entries(poolsData).forEach(([dexName, pools]) => {
      console.log(`\n🔍 ${dexName.toUpperCase()} - ${pools.length} pools:`);
      
      pools.slice(0, 3).forEach((pool, index) => {
        console.log(`  Pool ${index + 1} (${pool.id}):`);
        console.log(`    Tokens: ${pool.token0?.symbol}/${pool.token1?.symbol}`);
        console.log(`    Decimais: ${pool.token0?.decimals}/${pool.token1?.decimals}`);
        
        // Dados específicos para cada tipo de DEX
        if (dexName === 'uniswap') {
          console.log(`    sqrtPrice: ${pool.sqrtPrice}`);
          console.log(`    token0Price: ${pool.token0Price}`);
          console.log(`    token1Price: ${pool.token1Price}`);
          console.log(`    tick: ${pool.tick}`);
          console.log(`    feeTier: ${pool.feeTier}`);
        } else {
          console.log(`    token0Price: ${pool.token0Price}`);
          console.log(`    token1Price: ${pool.token1Price}`);
        }
        
        console.log(`    TVL: $${pool.totalValueLockedUSD}`);
        console.log(`    Volume: $${pool.volumeUSD}`);
        console.log('');
      });
    });

    console.log('📊 Passo 3: Testar cálculos de preços individuais...');
    Object.entries(poolsData).forEach(([dexName, pools]) => {
      console.log(`\n🧮 Testando cálculos para ${dexName}:`);
      
      pools.slice(0, 2).forEach((pool, index) => {
        console.log(`  Pool ${index + 1}: ${pool.token0?.symbol}/${pool.token1?.symbol}`);
        
        // Testar diferentes métodos de cálculo
        if (dexName === 'uniswap' && pool.sqrtPrice) {
          // Método 1: sqrtPrice (atual)
          const sqrtPrice = parseFloat(pool.sqrtPrice);
          const token0Decimals = parseInt(pool.token0.decimals);
          const token1Decimals = parseInt(pool.token1.decimals);
          
          console.log(`    Método sqrtPrice:`);
          console.log(`      sqrtPrice raw: ${sqrtPrice}`);
          console.log(`      Decimais: ${token0Decimals}/${token1Decimals}`);
          
          try {
            // Cálculo atual (que pode estar errado)
            const Q96 = BigInt(2) ** BigInt(96);
            const sqrtPriceBigInt = BigInt(Math.floor(sqrtPrice));
            const numerator = sqrtPriceBigInt * sqrtPriceBigInt;
            const denominator = Q96 * Q96;
            const decimalAdjustment = BigInt(10) ** BigInt(token1Decimals - token0Decimals);
            const priceBigInt = (numerator * decimalAdjustment) / denominator;
            const calculatedPrice = Number(priceBigInt) / Math.pow(10, token1Decimals);
            
            console.log(`      Preço calculado (BigInt): ${calculatedPrice}`);
          } catch (error) {
            console.log(`      ❌ Erro BigInt: ${error.message}`);
          }
          
          // Método 2: token0Price direto
          if (pool.token0Price) {
            const directPrice = parseFloat(pool.token0Price);
            console.log(`      Preço direto (token0Price): ${directPrice}`);
          }
          
          // Método 3: Fórmula alternativa
          try {
            const price = (sqrtPrice / Math.pow(2, 96)) ** 2;
            const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals);
            console.log(`      Preço alternativo: ${adjustedPrice}`);
          } catch (error) {
            console.log(`      ❌ Erro método alternativo: ${error.message}`);
          }
        }
        
        // Para QuickSwap
        if (dexName !== 'uniswap' && pool.token0Price) {
          const price = parseFloat(pool.token0Price);
          console.log(`    token0Price direto: ${price}`);
        }
        
        console.log('');
      });
    });

    console.log('📊 Passo 4: Processar com método atual e identificar problemas...');
    const processedData = graphService.processPoolsData(poolsData);
    
    console.log('\n📊 Resultados do processamento atual:');
    console.log(`  Pools válidos: ${processedData.stats.validPools}`);
    console.log(`  Pools inválidos: ${processedData.stats.invalidPools}`);
    console.log(`  Score qualidade: ${processedData.stats.marketStats.qualityScore.toFixed(1)}%`);
    console.log(`  Spread médio: ${processedData.stats.marketStats.averageSpread.toFixed(4)}%`);
    console.log(`  Spread máximo: ${processedData.stats.marketStats.maxSpread.toFixed(4)}%`);
    
    console.log('\n📊 Passo 5: Analisar spreads suspeitos...');
    if (processedData.stats.marketStats.suspiciousPairs.length > 0) {
      console.log('⚠️ Pares com spreads altos:');
      processedData.stats.marketStats.suspiciousPairs.forEach((pair, index) => {
        console.log(`  ${index + 1}. ${pair.pair}: ${pair.spread}%`);
        console.log(`     Range: ${pair.priceRange}`);
        console.log(`     DEXs: ${Object.keys(pair.prices).join(', ')}`);
        console.log(`     Preços: ${JSON.stringify(pair.prices, null, 6)}`);
        console.log('');
      });
    }

    console.log('📊 Passo 6: Propor correções baseadas na análise...');
    console.log('\n🎯 Próximos passos para correção:');
    
    // Identificar padrões nos problemas
    const hasUniswapIssues = processedData.stats.marketStats.suspiciousPairs.some(
      pair => pair.prices.uniswap && pair.prices.quickswap && 
      Math.abs(pair.prices.uniswap - pair.prices.quickswap) / Math.min(pair.prices.uniswap, pair.prices.quickswap) > 5
    );
    
    if (hasUniswapIssues) {
      console.log('  1. ⚠️ Detectado: Problema nos cálculos Uniswap V3');
      console.log('     Solução: Revisar fórmula sqrtPriceX96 ou usar token0Price/token1Price como principal');
    }
    
    const hasDecimalIssues = processedData.stats.marketStats.suspiciousPairs.some(
      pair => Object.values(pair.prices).some(price => price > 10000 || price < 0.0001)
    );
    
    if (hasDecimalIssues) {
      console.log('  2. ⚠️ Detectado: Possível problema de decimais');
      console.log('     Solução: Normalizar decimais antes do cálculo');
    }

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar debug
if (require.main === module) {
  debugSpreads().then(() => {
    console.log('\n✅ Debug de spreads concluído');
  }).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { debugSpreads };