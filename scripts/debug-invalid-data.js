const ArbitrageService = require('../src/services/arbitrageService');

// Dados de teste simples para diagnosticar
const testData = {
  'USDC/WETH': {
    uniswap: 0.0002631,
    quickswap: 0.0002500
  },
  'WETH/USDC': {
    uniswap: 3800.50,
    quickswap: 4000.00
  },
  'USDC/WMATIC': {
    uniswap: 2.00,
    quickswap: 1.95
  },
  'WMATIC/USDC': {
    uniswap: 0.500,
    quickswap: 0.513
  },
  'WETH/WMATIC': {
    uniswap: 1900.00,
    quickswap: 1950.00
  },
  'WMATIC/WETH': {
    uniswap: 0.000526,
    quickswap: 0.000513
  }
};

async function debugInvalidData() {
  console.log('🔍 Debug: Investigando "Dados inválidos"\n');

  const arbitrageService = new ArbitrageService();
  const gasPrice = 30000000000; // 30 gwei

  try {
    console.log('📊 Passo 1: Teste de detecção triangular isolada');
    const triangularOpportunities = arbitrageService.detectTriangularArbitrage(testData);
    console.log(`   Oportunidades triangulares detectadas: ${triangularOpportunities.length}`);
    
    if (triangularOpportunities.length > 0) {
      console.log('   Primeira oportunidade triangular:');
      const first = triangularOpportunities[0];
      console.log(`     - Type: ${first.type}`);
      console.log(`     - Pair: ${first.pair || 'UNDEFINED'}`);
      console.log(`     - IsValid: ${first.isValid}`);
      console.log(`     - EstimatedProfit: ${first.estimatedProfit}`);
      console.log(`     - Quality: ${first.quality}`);
      console.log(`     - Path: ${first.path ? first.path.join(' → ') : 'UNDEFINED'}`);
    }

    console.log('\n📊 Passo 2: Teste de detecção direta');
    const directOpportunities = arbitrageService.detectDirectArbitrage(testData);
    console.log(`   Oportunidades diretas detectadas: ${directOpportunities.length}`);

    console.log('\n📊 Passo 3: Análise completa');
    const analysis = arbitrageService.analyzeOpportunities(testData, gasPrice);
    
    console.log('✅ Análise completa:');
    console.log(`   Direct: ${analysis.direct}`);
    console.log(`   Triangular: ${analysis.triangular}`);
    console.log(`   Total: ${analysis.total}`);
    console.log(`   Profitable: ${analysis.profitable}`);
    console.log(`   Rejected: ${analysis.rejected}`);

    console.log('\n📊 Passo 4: Detalhes das rejeitadas');
    if (analysis.rejectedOpportunities && analysis.rejectedOpportunities.length > 0) {
      console.log('   Oportunidades rejeitadas:');
      analysis.rejectedOpportunities.forEach((rej, index) => {
        console.log(`     ${index + 1}. ${rej.pair || rej.type || 'UNKNOWN'}: ${rej.rejectionReason}`);
        console.log(`        - Type: ${rej.type}`);
        console.log(`        - IsValid: ${rej.isValid}`);
        console.log(`        - EstimatedProfit: ${rej.estimatedProfit || 'N/A'}`);
      });
    }

    console.log('\n📊 Passo 5: Teste de validação individual');
    if (triangularOpportunities.length > 0) {
      const testOpp = triangularOpportunities[0];
      console.log('   Testando validação da primeira oportunidade triangular...');
      const validated = arbitrageService.validateOpportunity(testOpp, gasPrice);
      console.log(`     - IsProfitable: ${validated.isProfitable}`);
      console.log(`     - RejectionReason: ${validated.rejectionReason || 'NENHUMA'}`);
      console.log(`     - NetProfit: ${validated.netProfit || 'N/A'}`);
      console.log(`     - TotalCosts: ${validated.totalCosts || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Erro durante debug:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar debug
debugInvalidData().then(() => {
  console.log('\n✅ Debug concluído');
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});