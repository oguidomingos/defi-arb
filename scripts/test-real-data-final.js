const GraphService = require('../src/services/graphService');

async function testRealDataIntegration() {
  console.log('🔍 TESTE FINAL: Verificando integração com dados REAIS\n');

  const graphService = new GraphService();

  try {
    console.log('📡 Buscando dados das DEXs...');
    const poolsData = await graphService.getAllPoolsData();
    
    console.log('\n📊 ANÁLISE DOS DADOS RECEBIDOS:');
    
    let totalPools = 0;
    let realDataConfirmed = false;
    let poolExamples = [];

    Object.entries(poolsData).forEach(([dexName, pools]) => {
      console.log(`\n🏢 ${dexName.toUpperCase()}:`);
      console.log(`   Pools encontrados: ${pools.length}`);
      totalPools += pools.length;

      if (pools.length > 0) {
        const firstPool = pools[0];
        poolExamples.push({ dex: dexName, pool: firstPool });
        
        // Verificar se são dados reais
        const isRealID = firstPool.id && firstPool.id.length > 20 && firstPool.id.startsWith('0x');
        const hasRealTVL = firstPool.totalValueLockedUSD && parseFloat(firstPool.totalValueLockedUSD) > 1000;
        const hasRealLiquidity = firstPool.totalLiquidity && parseFloat(firstPool.totalLiquidity) > 1000;
        
        console.log(`   📋 Pool exemplo: ${firstPool.id?.substring(0, 16)}...`);
        console.log(`   💰 TVL/Liquidez: $${parseFloat(firstPool.totalValueLockedUSD || firstPool.totalLiquidity || 0).toLocaleString()}`);
        
        if (firstPool.token0 && firstPool.token1) {
          console.log(`   💱 Par: ${firstPool.token0.symbol}/${firstPool.token1.symbol}`);
        } else if (firstPool.tokens && firstPool.tokens.length > 0) {
          const tokenSymbols = firstPool.tokens.slice(0, 3).map(t => t.symbol).join('/');
          console.log(`   💱 Tokens: ${tokenSymbols}${firstPool.tokens.length > 3 ? '...' : ''}`);
        }
        
        if (isRealID && (hasRealTVL || hasRealLiquidity)) {
          console.log('   ✅ DADOS REAIS CONFIRMADOS!');
          realDataConfirmed = true;
        } else {
          console.log(`   ⚠️ Dados suspeitos - ID real: ${isRealID}, TVL válido: ${hasRealTVL || hasRealLiquidity}`);
        }
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RESULTADO FINAL:');
    console.log('='.repeat(60));

    if (realDataConfirmed && totalPools > 0) {
      console.log('✅ SUCESSO! O sistema está usando DADOS REAIS do blockchain!');
      console.log(`📊 Total: ${totalPools} pools reais encontrados`);
      console.log('🎉 Problema de dados simulados RESOLVIDO!');
      
      console.log('\n📈 Processando dados para preços...');
      const processedData = graphService.processPoolsData(poolsData);
      
      if (processedData.stats.validPools > 0) {
        console.log(`✅ ${processedData.stats.validPools} pools processados com sucesso`);
        console.log(`📊 Pares de tokens disponíveis: ${Object.keys(processedData.tokenPrices).length}`);
        
        // Mostrar alguns preços reais
        console.log('\n💰 PREÇOS REAIS EXEMPLOS:');
        Object.entries(processedData.tokenPrices).slice(0, 5).forEach(([pair, prices]) => {
          const dexPrices = Object.entries(prices).map(([dex, price]) => `${dex}: ${parseFloat(price).toFixed(6)}`).join(', ');
          console.log(`   ${pair}: ${dexPrices}`);
        });
      }

    } else if (totalPools > 0 && !realDataConfirmed) {
      console.log('⚠️ ATENÇÃO: Dados encontrados mas podem não ser completamente reais');
      console.log('Verifique se os endpoints estão retornando dados atualizados do blockchain');
      
    } else if (totalPools === 0) {
      console.log('❌ PROBLEMA: Nenhum pool encontrado');
      console.log('Possíveis causas:');
      console.log('1. API key do The Graph inválida ou expirada');
      console.log('2. Endpoints não estão funcionando');
      console.log('3. Tokens configurados não têm pools nos endpoints testados');
      
    } else {
      console.log('❌ PROBLEMA: Sistema ainda está usando dados simulados');
      console.log('Os endpoints podem estar funcionando mas retornando dados vazios/inválidos');
    }

    // Verificar se há dados simulados óbvios
    const hasSimulatedIDs = poolExamples.some(example => 
      example.pool.id && (example.pool.id === '0x1' || example.pool.id === '0x2' || example.pool.id.length < 10)
    );

    if (hasSimulatedIDs) {
      console.log('\n🚨 ATENÇÃO: Detectados IDs suspeitos de simulação!');
      console.log('O sistema pode estar fazendo fallback para dados simulados');
    }

  } catch (error) {
    console.log('\n❌ ERRO durante o teste:');
    console.log(`Erro: ${error.message}`);
    console.log('\nPossíveis soluções:');
    console.log('1. Verificar se THE_GRAPH_API_KEY está definida no .env');
    console.log('2. Testar conectividade com os endpoints manualmente');
    console.log('3. Verificar se os endpoints não mudaram novamente');
  }
}

// Executar teste
testRealDataIntegration().catch(console.error);