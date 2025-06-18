const { TriangularArbitrageService } = require('../src/services/triangularArbitrageService');
const ArbitrageService = require('../src/services/arbitrageService');

// Dados de teste simulando um cenário de arbitragem triangular
const mockTriangularData = {
  // Preços que criam uma oportunidade triangular USDC → WETH → WMATIC → USDC
  'USDC/WETH': {
    uniswap: 0.0002631,  // 1 USDC = 0.0002631 WETH (WETH caro na Uniswap)
    quickswap: 0.0002500 // 1 USDC = 0.0002500 WETH (WETH mais barato na QuickSwap)
  },
  'WETH/USDC': {
    uniswap: 3800.50,    // 1 WETH = 3800.50 USDC 
    quickswap: 4000.00   // 1 WETH = 4000.00 USDC
  },
  'WETH/WMATIC': {
    uniswap: 1900.00,    // 1 WETH = 1900 WMATIC
    quickswap: 1950.00   // 1 WETH = 1950 WMATIC
  },
  'WMATIC/WETH': {
    uniswap: 0.000526,   // 1 WMATIC = 0.000526 WETH
    quickswap: 0.000513  // 1 WMATIC = 0.000513 WETH
  },
  'USDC/WMATIC': {
    uniswap: 2.00,       // 1 USDC = 2.00 WMATIC
    quickswap: 1.95      // 1 USDC = 1.95 WMATIC
  },
  'WMATIC/USDC': {
    uniswap: 0.500,      // 1 WMATIC = 0.500 USDC
    quickswap: 0.513     // 1 WMATIC = 0.513 USDC
  }
};

async function testTriangularArbitrage() {
  console.log('🧪 Teste de Arbitragem Triangular - Sprint 2\n');

  // Teste 1: Serviço Triangular Standalone
  console.log('📊 Teste 1: Serviço Triangular Standalone');
  const triangularService = new TriangularArbitrageService();
  const triangularResult = triangularService.detectOpportunities(mockTriangularData);

  console.log('✅ Detecção triangular concluída:');
  console.log(`   Oportunidades válidas: ${triangularResult.stats.valid}`);
  console.log(`   Oportunidades rejeitadas: ${triangularResult.stats.rejected}`);
  console.log(`   Total analisadas: ${triangularResult.stats.total}`);
  console.log(`   Grafo: ${triangularResult.stats.graphStats.vertices} tokens, ${triangularResult.stats.graphStats.edges} arestas\n`);

  // Teste 2: Serviço de Arbitragem Integrado
  console.log('🔍 Teste 2: Serviço de Arbitragem Integrado');
  const arbitrageService = new ArbitrageService();
  const gasPrice = 30000000000; // 30 gwei
  const analysis = arbitrageService.analyzeOpportunities(mockTriangularData, gasPrice);

  console.log('✅ Análise integrada concluída:');
  console.log(`   Arbitragem direta: ${analysis.direct}`);
  console.log(`   Arbitragem triangular: ${analysis.triangular}`);
  console.log(`   Total encontradas: ${analysis.total}`);
  console.log(`   Lucrativas: ${analysis.profitable}`);
  console.log(`   Rejeitadas: ${analysis.rejected}`);
  
  if (analysis.qualityStats) {
    console.log(`   Qualidade: Alta(${analysis.qualityStats.high}) Média(${analysis.qualityStats.medium}) Baixa(${analysis.qualityStats.low})`);
  }
  console.log('');

  // Teste 3: Detalhes das Oportunidades Triangulares
  if (triangularResult.opportunities.length > 0) {
    console.log('🎯 Teste 3: Detalhes das Oportunidades Triangulares');
    triangularResult.opportunities.slice(0, 3).forEach((opp, index) => {
      const formatted = triangularService.formatOpportunity(opp);
      console.log(`   ${index + 1}. ${formatted.description}`);
      console.log(`      Caminho: ${formatted.path}`);
      console.log(`      Lucro: ${formatted.profitPercent}`);
      console.log(`      Liquidez mín: ${formatted.minLiquidity}`);
      console.log(`      Volume total: ${formatted.totalVolume}`);
      console.log(`      DEXs utilizadas: ${formatted.dexCount} (${formatted.dexs.join(', ')})`);
      console.log(`      Qualidade: ${formatted.quality}`);
      console.log(`      Tokens: ${formatted.tokens.join(' → ')}`);
      console.log('');
    });
  }

  // Teste 4: Análise Manual de Ciclo
  console.log('🔧 Teste 4: Análise Manual de Ciclo');
  const manualCycle = [
    { from: 'USDC', to: 'WETH', rate: 0.0002500, dex: 'quickswap', metadata: { liquidity: 1000000 } },
    { from: 'WETH', to: 'WMATIC', rate: 1950.00, dex: 'quickswap', metadata: { liquidity: 800000 } },
    { from: 'WMATIC', to: 'USDC', rate: 0.513, dex: 'quickswap', metadata: { liquidity: 500000 } }
  ];

  const graph = triangularService.graph;
  const cycleAnalysis = graph.calculateCycleProfit(manualCycle);
  
  console.log('✅ Análise de ciclo manual:');
  console.log(`   Taxa total: ${cycleAnalysis.totalRate.toFixed(8)}`);
  console.log(`   Lucro: ${cycleAnalysis.profit.toFixed(8)} (${cycleAnalysis.profitPercent.toFixed(4)}%)`);
  console.log(`   Liquidez mínima: $${cycleAnalysis.minLiquidity.toLocaleString()}`);
  console.log(`   Válido: ${cycleAnalysis.isValid ? 'Sim' : 'Não'}`);
  console.log(`   Qualidade: ${cycleAnalysis.quality.toUpperCase()}`);
  console.log('');

  // Teste 5: Simulação de Execução
  console.log('💰 Teste 5: Simulação de Execução');
  if (triangularResult.opportunities.length > 0) {
    const bestOpp = triangularResult.opportunities[0];
    console.log('✅ Simulando execução da melhor oportunidade:');
    console.log(`   Tokens: ${bestOpp.tokens.join(' → ')}`);
    console.log(`   Lucro estimado: ${bestOpp.profitPercent.toFixed(4)}%`);
    console.log(`   Valor inicial: $1,000`);
    console.log(`   Valor final: $${(1000 * (1 + bestOpp.profit)).toFixed(2)}`);
    console.log(`   Lucro bruto: $${(1000 * bestOpp.profit).toFixed(2)}`);
    
    // Simular custos
    const estimatedGas = 0.50; // $0.50 em gás
    const protocolFees = 1000 * 0.009; // 0.9% em taxas (3 x 0.3%)
    const totalCosts = estimatedGas + protocolFees;
    const netProfitUSD = (1000 * bestOpp.profit) - totalCosts;
    
    console.log(`   Custos estimados: $${totalCosts.toFixed(2)} (gás: $${estimatedGas}, taxas: $${protocolFees.toFixed(2)})`);
    console.log(`   Lucro líquido: $${netProfitUSD.toFixed(2)}`);
    console.log(`   ROI líquido: ${(netProfitUSD / 1000 * 100).toFixed(4)}%`);
  }

  // Resumo dos testes
  console.log('\n📋 Resumo dos Testes Sprint 2:');
  console.log(`✅ Construção do grafo: ${triangularResult.stats.graphStats.vertices > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Algoritmo Bellman-Ford: ${triangularResult.stats.total > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Detecção de ciclos: ${triangularResult.opportunities.length > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Integração com ArbitrageService: ${analysis.triangular > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Formatação de oportunidades: ${triangularResult.opportunities.length > 0 ? 'PASSOU' : 'FALHOU'}`);
  
  const allTestsPassed = 
    triangularResult.stats.graphStats.vertices > 0 &&
    triangularResult.stats.total > 0 &&
    triangularResult.opportunities.length > 0 &&
    analysis.triangular > 0;
    
  console.log(`\n${allTestsPassed ? '🎉' : '❌'} Status Sprint 2: ${allTestsPassed ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM'}`);
  
  return {
    success: allTestsPassed,
    triangularOpportunities: triangularResult.opportunities.length,
    directOpportunities: analysis.direct,
    totalOpportunities: analysis.total,
    profitableOpportunities: analysis.profitable
  };
}

// Executar testes
if (require.main === module) {
  testTriangularArbitrage().then(result => {
    console.log('\n✅ Teste de arbitragem triangular concluído');
    if (!result.success) {
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  });
}

module.exports = { testTriangularArbitrage, mockTriangularData };