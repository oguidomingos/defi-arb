console.log('🔧 Testando Correções de "Dados Inválidos"...\n');

const ArbitrageService = require('../src/services/arbitrageService');

// Dados simples para teste
const simpleData = {
  'USDC/WETH': { uniswap: 0.0002631, quickswap: 0.0002500 },
  'WETH/USDC': { uniswap: 3800.50, quickswap: 4000.00 },
  'USDC/WMATIC': { uniswap: 2.00, quickswap: 1.95 },
  'WMATIC/USDC': { uniswap: 0.500, quickswap: 0.513 },
  'WETH/WMATIC': { uniswap: 1900.00, quickswap: 1950.00 },
  'WMATIC/WETH': { uniswap: 0.000526, quickswap: 0.000513 }
};

const arbitrageService = new ArbitrageService();
const gasPrice = 30000000000;

try {
  console.log('📊 Executando análise completa...');
  const analysis = arbitrageService.analyzeOpportunities(simpleData, gasPrice);
  
  console.log('\n✅ Resultados:');
  console.log(`   Arbitragem direta: ${analysis.direct}`);
  console.log(`   Arbitragem triangular: ${analysis.triangular}`);
  console.log(`   Total: ${analysis.total}`);
  console.log(`   Lucrativas: ${analysis.profitable}`);
  console.log(`   Rejeitadas: ${analysis.rejected}`);
  
  if (analysis.rejectedOpportunities && analysis.rejectedOpportunities.length > 0) {
    console.log('\n⚠️ Motivos de rejeição:');
    analysis.rejectedOpportunities.forEach((rej, i) => {
      console.log(`   ${i+1}. ${rej.pair || rej.type}: ${rej.rejectionReason}`);
    });
  }
  
  if (analysis.profitable > 0) {
    console.log('\n🎯 Oportunidades lucrativas encontradas!');
    analysis.opportunities.slice(0, 2).forEach((opp, i) => {
      console.log(`   ${i+1}. ${opp.pair || opp.path?.join('→') || opp.type}`);
      console.log(`      Lucro: ${opp.estimatedProfit?.toFixed(4) || opp.profit}%`);
      console.log(`      Lucro líquido: ${opp.netProfit?.toFixed(4) || 'N/A'}%`);
    });
  }
  
  const hasTriangular = analysis.triangular > 0;
  const noInvalidData = !analysis.rejectedOpportunities.some(r => r.rejectionReason === 'Dados inválidos');
  
  console.log('\n📋 Status da correção:');
  console.log(`✅ Detecção triangular: ${hasTriangular ? 'FUNCIONANDO' : 'PENDENTE'}`);
  console.log(`✅ Problema "Dados inválidos": ${noInvalidData ? 'CORRIGIDO' : 'PERSISTE'}`);
  
  if (hasTriangular && noInvalidData) {
    console.log('\n🎉 CORREÇÃO APLICADA COM SUCESSO!');
  } else {
    console.log('\n⚠️ Ainda há problemas a resolver...');
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error(error.stack);
}