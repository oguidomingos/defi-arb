const GraphService = require('../src/services/graphService');
const ArbitrageService = require('../src/services/arbitrageService');
const { TriangularArbitrageService } = require('../src/services/triangularArbitrageService');
const config = require('../src/config');

/**
 * Script para comparar o comportamento do sistema principal vs script debug
 * OBJETIVO: Identificar exatamente onde está a diferença
 */

async function debugSystemVsDebug() {
  console.log('🔍 DEBUG: Comparando Sistema Principal vs Script Debug\n');

  try {
    // 1. Obter dados básicos
    console.log('1. Obtendo dados básicos...');
    const graphService = new GraphService();
    const marketData = await graphService.getUpdatedData();
    
    console.log(`📊 Dados base: ${Object.keys(marketData.tokenPrices).length} pares`);

    // 2. Testar TriangularArbitrageService diretamente (como no debug)
    console.log('\n2. Testando TriangularArbitrageService DIRETO...');
    const triangularService = new TriangularArbitrageService();
    const directResult = triangularService.detectOpportunities(marketData.tokenPrices);
    
    console.log(`✅ DIRETO - Oportunidades: ${directResult.opportunities.length}`);
    console.log(`✅ DIRETO - Rejeitadas: ${directResult.rejectedOpportunities.length}`);
    console.log(`✅ DIRETO - Grafo: ${directResult.stats.graphStats.vertices} vértices, ${directResult.stats.graphStats.edges} arestas`);

    // 3. Testar através do ArbitrageService (sistema principal)
    console.log('\n3. Testando através do ArbitrageService (SISTEMA PRINCIPAL)...');
    const arbitrageService = new ArbitrageService();
    
    // Interceptar o método detectTriangularArbitrage
    const originalDetectTriangular = arbitrageService.detectTriangularArbitrage.bind(arbitrageService);
    arbitrageService.detectTriangularArbitrage = function(tokenPrices) {
      console.log('🔧 ArbitrageService.detectTriangularArbitrage() chamado');
      console.log(`   Input tokenPrices keys: ${Object.keys(tokenPrices).length}`);
      
      // Interceptar o triangularService interno
      const originalTriangularDetect = this.triangularService.detectOpportunities.bind(this.triangularService);
      this.triangularService.detectOpportunities = function(innerTokenPrices) {
        console.log('🔧 triangularService.detectOpportunities() interno chamado');
        console.log(`   Inner tokenPrices keys: ${Object.keys(innerTokenPrices).length}`);
        
        // Verificar se os dados são idênticos
        const keysMatch = JSON.stringify(Object.keys(tokenPrices).sort()) === JSON.stringify(Object.keys(innerTokenPrices).sort());
        console.log(`   Chaves idênticas ao input original: ${keysMatch}`);
        
        if (!keysMatch) {
          console.log('❌ PROBLEMA: Dados diferentes chegando ao triangularService interno!');
          console.log('   Original keys:', Object.keys(tokenPrices).slice(0, 5));
          console.log('   Inner keys:', Object.keys(innerTokenPrices).slice(0, 5));
        }
        
        return originalTriangularDetect(innerTokenPrices);
      };
      
      return originalDetectTriangular(tokenPrices);
    };
    
    const systemResult = arbitrageService.detectTriangularArbitrage(marketData.tokenPrices);
    
    console.log(`✅ SISTEMA - Oportunidades: ${systemResult.length}`);

    // 4. Testar o analyzeOpportunities completo
    console.log('\n4. Testando analyzeOpportunities completo...');
    const gasPrice = 30; // 30 gwei simulado
    const fullAnalysis = arbitrageService.analyzeOpportunities(marketData.tokenPrices, gasPrice);
    
    console.log(`✅ ANÁLISE COMPLETA:`);
    console.log(`   Diretas: ${fullAnalysis.direct}`);
    console.log(`   Triangulares: ${fullAnalysis.triangular}`);
    console.log(`   Total: ${fullAnalysis.total}`);
    console.log(`   Lucrativas: ${fullAnalysis.profitable}`);
    console.log(`   Rejeitadas: ${fullAnalysis.rejected}`);

    // 5. Verificar configurações críticas
    console.log('\n5. Verificando configurações críticas...');
    console.log('='.repeat(50));
    
    console.log('🔧 Config.arbitrageConfig:', config.arbitrageConfig || 'UNDEFINED');
    console.log('🔧 Config.minProfitabilityThreshold:', config.minProfitabilityThreshold);
    console.log('🔧 Config.qualityFilters.minLiquidityUSD:', config.qualityFilters?.minLiquidityUSD || config.qualityFilters?.base?.minLiquidityUSD || 'UNDEFINED');
    
    // Testar valores padrão usados no código
    const minProfitPercent = config.arbitrageConfig?.minProfitPercent || 0.1;
    const minLiquidityUSD = config.qualityFilters?.minLiquidityUSD || 50000;
    
    console.log('🎯 Valores efetivos usados:');
    console.log(`   minProfitPercent: ${minProfitPercent}%`);
    console.log(`   minLiquidityUSD: $${minLiquidityUSD}`);

    // 6. Simular oportunidade manual para teste
    console.log('\n6. Simulando oportunidade manual...');
    console.log('='.repeat(50));
    
    // Criar dados de teste simples
    const testTokenPrices = {
      'USDC/WETH': {
        'uniswap': 2500,
        'quickswap': 2505
      },
      'WETH/WMATIC': {
        'uniswap': 0.0001,
        'quickswap': 0.0001
      },
      'WMATIC/USDC': {
        'uniswap': 5.4,
        'quickswap': 5.4
      }
    };
    
    console.log('🧪 Testando com dados simulados...');
    const testService = new TriangularArbitrageService();
    const testResult = testService.detectOpportunities(testTokenPrices);
    
    console.log(`✅ TESTE SIMULADO:`);
    console.log(`   Oportunidades: ${testResult.opportunities.length}`);
    console.log(`   Grafo: ${testResult.stats.graphStats.vertices} vértices, ${testResult.stats.graphStats.edges} arestas`);

    // 7. Comparação final
    console.log('\n7. COMPARAÇÃO FINAL:');
    console.log('='.repeat(50));
    console.log(`Método DIRETO:     ${directResult.opportunities.length} oportunidades, ${directResult.stats.graphStats.vertices} vértices`);
    console.log(`Sistema PRINCIPAL: ${systemResult.length} oportunidades`);
    console.log(`Teste SIMULADO:    ${testResult.opportunities.length} oportunidades, ${testResult.stats.graphStats.vertices} vértices`);
    
    if (directResult.opportunities.length !== systemResult.length) {
      console.log('\n❌ CONFIRMADO: Há diferença entre método direto e sistema principal!');
      console.log('   Provável causa: Filtros ou processamento adicional no ArbitrageService');
    } else {
      console.log('\n✅ Métodos produzem resultados idênticos');
    }

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar debug
if (require.main === module) {
  debugSystemVsDebug();
}

module.exports = { debugSystemVsDebug };