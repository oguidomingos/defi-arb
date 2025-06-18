console.log('🔧 Sprint 3 - Testando Correção de Spreads...\n');

const GraphService = require('../src/services/graphService');

async function testSpreadFix() {
  const graphService = new GraphService();

  try {
    console.log('📊 Executando teste com correções aplicadas...');
    const data = await graphService.getUpdatedData();
    
    console.log('\n✅ Resultados após correções:');
    console.log(`   Pools processados: ${data.processedPools.length}`);
    console.log(`   Pools válidos: ${data.stats.validPools}`);
    console.log(`   Pools inválidos: ${data.stats.invalidPools}`);
    console.log(`   Score de qualidade: ${data.stats.marketStats.qualityScore.toFixed(1)}%`);
    console.log(`   Spread médio: ${data.stats.marketStats.averageSpread.toFixed(4)}%`);
    console.log(`   Spread máximo: ${data.stats.marketStats.maxSpread.toFixed(4)}%`);
    
    // Verificar se melhorou
    const spreadImproved = data.stats.marketStats.maxSpread < 100; // Menos de 100%
    const qualityImproved = data.stats.marketStats.qualityScore > 50; // Mais de 50%
    
    console.log('\n📊 Análise da melhoria:');
    console.log(`   Spreads controlados (<100%): ${spreadImproved ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Qualidade melhorada (>50%): ${qualityImproved ? '✅ SIM' : '❌ NÃO'}`);
    
    if (data.stats.marketStats.suspiciousPairs.length > 0) {
      console.log(`\n⚠️ Pares ainda suspeitos (${data.stats.marketStats.suspiciousPairs.length}):`);
      data.stats.marketStats.suspiciousPairs.slice(0, 3).forEach((pair, i) => {
        console.log(`   ${i+1}. ${pair.pair}: ${pair.spread}% (${pair.priceRange})`);
      });
    }
    
    const success = spreadImproved && data.stats.marketStats.maxSpread < 50;
    
    console.log(`\n${success ? '🎉' : '⚠️'} Status: ${success ? 'CORREÇÃO APLICADA COM SUCESSO' : 'AINDA PRECISA DE AJUSTES'}`);
    
    return { success, maxSpread: data.stats.marketStats.maxSpread, quality: data.stats.marketStats.qualityScore };
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    return { success: false, error: error.message };
  }
}

// Executar
if (require.main === module) {
  testSpreadFix().then(result => {
    if (result.success) {
      console.log('\n✅ Teste de correção concluído com sucesso');
      process.exit(0);
    } else {
      console.log('\n❌ Teste falhou - mais correções necessárias');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { testSpreadFix };