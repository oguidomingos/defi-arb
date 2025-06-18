console.log('🧪 Teste Simples - Verificando imports...');

try {
  const { TriangularArbitrageService } = require('../src/services/triangularArbitrageService');
  console.log('✅ TriangularArbitrageService importado com sucesso');
  
  const triangularService = new TriangularArbitrageService();
  console.log('✅ TriangularArbitrageService instanciado com sucesso');
  
  const ArbitrageService = require('../src/services/arbitrageService');
  console.log('✅ ArbitrageService importado com sucesso');
  
  const arbitrageService = new ArbitrageService();
  console.log('✅ ArbitrageService instanciado com sucesso');
  
  // Teste básico de dados
  const mockData = {
    'USDC/WETH': { uniswap: 0.0002631, quickswap: 0.0002500 },
    'WETH/USDC': { uniswap: 3800.50, quickswap: 4000.00 }
  };
  
  console.log('🔍 Testando detecção básica...');
  const result = triangularService.detectOpportunities(mockData);
  console.log(`✅ Detecção executada: ${result.stats.total} oportunidades analisadas`);
  
  console.log('\n🎉 Todos os testes básicos passaram!');
  console.log('📋 Sprint 2 - Arbitragem Triangular implementado com sucesso');
  
} catch (error) {
  console.error('❌ Erro no teste:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}