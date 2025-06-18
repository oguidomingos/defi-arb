const ArbitrageBot = require('../src/index');

async function runTests() {
  console.log('🧪 Iniciando testes do sistema de arbitragem...\n');

  try {
    // Criar instância do bot
    const bot = new ArbitrageBot();
    
    console.log('1️⃣ Testando inicialização...');
    const initialized = await bot.initialize();
    if (initialized) {
      console.log('✅ Inicialização bem-sucedida\n');
    } else {
      console.log('❌ Falha na inicialização\n');
      return;
    }

    console.log('2️⃣ Testando coleta de dados de mercado...');
    const marketData = await bot.updateMarketData();
    if (marketData && marketData.processedPools.length > 0) {
      console.log(`✅ Dados coletados: ${marketData.processedPools.length} pools\n`);
    } else {
      console.log('❌ Falha na coleta de dados\n');
      return;
    }

    console.log('3️⃣ Testando análise de oportunidades...');
    const analysis = await bot.analyzeOpportunities(marketData);
    if (analysis) {
      console.log(`✅ Análise concluída: ${analysis.total} oportunidades encontradas\n`);
    } else {
      console.log('❌ Falha na análise\n');
      return;
    }

    console.log('4️⃣ Testando conectividade com blockchain...');
    const networkInfo = await bot.blockchainService.getNetworkInfo();
    if (networkInfo) {
      console.log(`✅ Conectado à rede: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})\n`);
    } else {
      console.log('❌ Falha na conectividade com blockchain\n');
      return;
    }

    console.log('5️⃣ Testando obtenção de preço do gás...');
    const gasPrice = await bot.blockchainService.getGasPrice();
    if (gasPrice) {
      console.log(`✅ Preço do gás: ${gasPrice.toString()} wei\n`);
    } else {
      console.log('❌ Falha ao obter preço do gás\n');
      return;
    }

    console.log('🎉 Todos os testes passaram com sucesso!');
    console.log('\n📊 Resumo dos testes:');
    console.log('   ✅ Inicialização do sistema');
    console.log('   ✅ Coleta de dados via Graph API');
    console.log('   ✅ Análise de oportunidades');
    console.log('   ✅ Conectividade com Polygon');
    console.log('   ✅ Obtenção de dados de gás');
    
    console.log('\n🚀 Sistema pronto para uso!');
    console.log('Execute "npm start" para iniciar o monitoramento contínuo.');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    console.log('\n🔧 Verifique:');
    console.log('   1. Se as variáveis de ambiente estão configuradas');
    console.log('   2. Se há conectividade com a internet');
    console.log('   3. Se as APIs estão funcionando');
  }
}

// Executar testes se for chamado diretamente
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  });
}

module.exports = { runTests }; 