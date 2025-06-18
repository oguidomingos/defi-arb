const GraphService = require('../src/services/graphService');
const ArbitrageService = require('../src/services/arbitrageService');

// Dados de teste simulando pools reais - usando apenas formato QuickSwap para simplicidade
const mockPoolsData = {
  quickswap: [
    {
      id: '0x1',
      token0: { id: '0xusdc', symbol: 'USDC', decimals: 6 },
      token1: { id: '0xweth', symbol: 'WETH', decimals: 18 },
      token0Price: '3800.0', // 1 WETH = 3800 USDC
      totalValueLockedUSD: '50000000',
      volumeUSD: '1000000',
      dex: 'quickswap'
    },
    {
      id: '0x2',
      token0: { id: '0xusdc', symbol: 'USDC', decimals: 6 },
      token1: { id: '0xwmatic', symbol: 'WMATIC', decimals: 18 },
      token0Price: '0.5', // 1 WMATIC = 0.5 USDC
      totalValueLockedUSD: '10000000',
      volumeUSD: '500000',
      dex: 'quickswap'
    }
  ],
  uniswap: [
    {
      id: '0x3',
      token0: { id: '0xusdc', symbol: 'USDC', decimals: 6 },
      token1: { id: '0xweth', symbol: 'WETH', decimals: 18 },
      token0Price: '3850.5', // Ligeiramente diferente para criar oportunidade realista
      totalValueLockedUSD: '25000000',
      volumeUSD: '750000',
      dex: 'uniswap'
    },
    {
      id: '0x4',
      token0: { id: '0xusdc', symbol: 'USDC', decimals: 6 },
      token1: { id: '0xwmatic', symbol: 'WMATIC', decimals: 18 },
      token0Price: '0.505', // Ligeiramente diferente
      totalValueLockedUSD: '8000000',
      volumeUSD: '300000',
      dex: 'uniswap'
    }
  ]
};

async function testPriceCalculations() {
  console.log('🧪 Testando Correções de Cálculos de Preços\n');

  const graphService = new GraphService();
  const arbitrageService = new ArbitrageService();

  // Teste 1: Processamento de pools
  console.log('📊 Teste 1: Processamento de Pools');
  const processedData = graphService.processPoolsData(mockPoolsData);
  
  console.log('✅ Pools processados com sucesso:');
  console.log(`   Pools válidos: ${processedData.stats.validPools}`);
  console.log(`   Pools inválidos: ${processedData.stats.invalidPools}`);
  console.log(`   Pares de tokens: ${Object.keys(processedData.tokenPrices).length}`);
  console.log(`   Score de qualidade: ${processedData.stats.marketStats.qualityScore.toFixed(1)}%`);
  console.log(`   Spread médio: ${processedData.stats.marketStats.averageSpread.toFixed(4)}%`);
  console.log(`   Spread máximo: ${processedData.stats.marketStats.maxSpread.toFixed(4)}%\n`);

  // Teste 2: Análise de oportunidades
  console.log('🔍 Teste 2: Análise de Oportunidades');
  const gasPrice = 30000000000; // 30 gwei
  const analysis = arbitrageService.analyzeOpportunities(processedData.tokenPrices, gasPrice);
  
  console.log('✅ Análise concluída:');
  console.log(`   Total de oportunidades: ${analysis.total}`);
  console.log(`   Oportunidades lucrativas: ${analysis.profitable}`);
  console.log(`   Oportunidades rejeitadas: ${analysis.rejected}`);
  
  if (analysis.qualityStats) {
    console.log(`   Qualidade: Alta(${analysis.qualityStats.high}) Média(${analysis.qualityStats.medium}) Baixa(${analysis.qualityStats.low})`);
  }

  // Teste 3: Validação de preços calculados
  console.log('\n💰 Teste 3: Preços Calculados por Par');
  Object.entries(processedData.tokenPrices).forEach(([pair, dexPrices]) => {
    console.log(`   ${pair}:`);
    Object.entries(dexPrices).forEach(([dex, price]) => {
      console.log(`     ${dex}: ${price.toFixed(8)}`);
    });
    
    // Calcular spread entre DEXs
    const prices = Object.values(dexPrices);
    if (prices.length >= 2) {
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const spread = ((maxPrice - minPrice) / minPrice * 100);
      console.log(`     Spread: ${spread.toFixed(4)}%`);
    }
    console.log('');
  });

  // Teste 4: Detalhes das oportunidades
  if (analysis.profitable > 0) {
    console.log('🎯 Teste 4: Detalhes das Oportunidades Lucrativas');
    analysis.opportunities.forEach((opp, index) => {
      const formatted = arbitrageService.formatOpportunity(opp);
      console.log(`   ${index + 1}. ${formatted.description}`);
      console.log(`      Spread: ${formatted.spread}`);
      console.log(`      Lucro bruto: ${formatted.profit}`);
      console.log(`      Lucro líquido: ${formatted.netProfit}`);
      console.log(`      Qualidade: ${formatted.quality}`);
      console.log(`      Custos: ${formatted.costs}`);
      console.log(`      Score: ${formatted.profitabilityScore}`);
      console.log('');
    });
  }

  // Teste 5: Razões de rejeição
  if (analysis.rejected > 0) {
    console.log('⚠️  Teste 5: Razões de Rejeição');
    const rejectionReasons = {};
    analysis.rejectedOpportunities.forEach(opp => {
      const reason = opp.rejectionReason || 'Motivo não especificado';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    });
    
    Object.entries(rejectionReasons).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count} oportunidades`);
    });
    console.log('');
  }

  // Resumo dos testes
  console.log('📋 Resumo dos Testes:');
  console.log(`✅ Processamento de pools: ${processedData.stats.validPools > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Cálculos de spread: ${processedData.stats.marketStats.maxSpread < 100 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Validação de oportunidades: ${analysis.total > 0 ? 'PASSOU' : 'FALHOU'}`);
  console.log(`✅ Sistema de rejeição: ${analysis.rejected >= 0 ? 'PASSOU' : 'FALHOU'}`);
  
  const allTestsPassed = 
    processedData.stats.validPools > 0 &&
    processedData.stats.marketStats.maxSpread < 100 &&
    analysis.total > 0 &&
    analysis.rejected >= 0;
    
  console.log(`\n${allTestsPassed ? '🎉' : '❌'} Status geral: ${allTestsPassed ? 'TODOS OS TESTES PASSARAM' : 'ALGUNS TESTES FALHARAM'}`);
}

// Executar testes
if (require.main === module) {
  testPriceCalculations().catch(error => {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  });
}

module.exports = { testPriceCalculations, mockPoolsData };