const GraphService = require('./services/graphService');
const ArbitrageService = require('./services/arbitrageService');
const BlockchainService = require('./services/blockchainService');
const config = require('./config');

class ArbitrageBot {
  constructor() {
    this.graphService = new GraphService();
    this.blockchainService = new BlockchainService(); // Inicializa primeiro
    this.arbitrageService = new ArbitrageService(this.blockchainService); // Passa a instância inicializada
    
    this.isRunning = false;
    this.lastDataUpdate = 0;
    this.opportunitiesFound = 0;
    this.executionsAttempted = 0;
    this.executionsSuccessful = 0;
  }

  async initialize() {
    console.log('🚀 Inicializando Sistema de Arbitragem na Polygon...\n');
    
    try {
      // Garantir que o provider esteja inicializado antes de qualquer outra operação
      await this.blockchainService.initializeProvider();

      // Verificar conectividade com a rede
      const networkInfo = await this.blockchainService.getNetworkInfo();
      if (networkInfo) {
        console.log('📡 Conectado à rede:', networkInfo.name);
        console.log('🔗 Chain ID:', networkInfo.chainId);
        console.log('📦 Bloco atual:', networkInfo.blockNumber);
        console.log('⛽ Preço do gás:', networkInfo.gasPrice, 'gwei\n');
      }

      // Verificar saldos da wallet
      const balances = await this.blockchainService.checkWalletBalance();
      if (balances) {
        console.log('💰 Saldos da wallet:');
        console.log('   MATIC:', balances.matic);
        console.log('   WMATIC:', balances.wmatic);
        console.log('   USDC:', balances.usdc, '\n');
      }

      // Inicializar contrato de flash loan e aguardar
      await this.blockchainService.initializeFlashLoanContract();

      console.log('✅ Sistema inicializado com sucesso!\n');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao inicializar sistema:', error);
      return false;
    }
  }

  async updateMarketData() {
    try {
      const marketData = await this.graphService.getUpdatedData();
      this.lastDataUpdate = Date.now();
      
      console.log(`📊 Dados de mercado atualizados:`);
      console.log(`   Pools processados: ${marketData.processedPools.length}`);
      console.log(`   Pares de tokens: ${Object.keys(marketData.tokenPrices).length}`);
      console.log(`   Timestamp: ${new Date(marketData.timestamp).toLocaleTimeString()}\n`);
      
      return marketData;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar dados de mercado:', error);
      return null;
    }
  }

  async analyzeOpportunities(marketData) {
    try {
      const gasPrice = await this.blockchainService.getGasPrice();
      
      // 🔍 DEBUG: Adicionar logs de diagnóstico antes da correção
      console.log('🔍 [DEBUG] Dados recebidos em analyzeOpportunities:');
      console.log(`   - Tipo do marketData: ${typeof marketData}`);
      console.log(`   - Chaves do marketData: ${Object.keys(marketData).join(', ')}`);
      console.log(`   - Tipo do tokenPrices: ${typeof marketData.tokenPrices}`);
      console.log(`   - Pares em tokenPrices: ${marketData.tokenPrices ? Object.keys(marketData.tokenPrices).length : 'NULL'}`);
      
      // Mostrar exemplo de dados tokenPrices se existir
      if (marketData.tokenPrices) {
        const samplePair = Object.keys(marketData.tokenPrices)[0];
        if (samplePair) {
          console.log(`   - Exemplo de par (${samplePair}): ${JSON.stringify(marketData.tokenPrices[samplePair])}`);
        }
      }
      
      const analysis = this.arbitrageService.analyzeOpportunities(
        marketData.tokenPrices,
        gasPrice
      );

      console.log(`🔍 Análise de oportunidades:`);
      console.log(`   Arbitragem direta: ${analysis.direct}`);
      console.log(`   Arbitragem triangular: ${analysis.triangular}`);
      console.log(`   Total encontradas: ${analysis.total}`);
      console.log(`   Lucrativas: ${analysis.profitable}`);
      console.log(`   Rejeitadas: ${analysis.rejected}`);
      
      if (analysis.qualityStats) {
        console.log(`   Qualidade: Alta(${analysis.qualityStats.high}) Média(${analysis.qualityStats.medium}) Baixa(${analysis.qualityStats.low})\n`);
      }

      if (analysis.profitable > 0) {
        console.log('🎯 Oportunidades lucrativas encontradas:');
        analysis.opportunities.slice(0, 3).forEach((opp, index) => {
          const formatted = this.arbitrageService.formatOpportunity(opp);
          console.log(`   ${index + 1}. ${formatted.description}`);
          console.log(`      Spread/Lucro: ${formatted.spread || formatted.profit}`);
          console.log(`      Lucro líquido: ${formatted.netProfit}`);
          console.log(`      Qualidade: ${formatted.quality}`);
          console.log(`      Custos: ${formatted.costs}`);
          console.log(`      Score: ${formatted.profitabilityScore}\n`);
        });
      } else {
        console.log('⚠️  Nenhuma oportunidade lucrativa encontrada no momento.\n');
        
        // Mostrar razões das rejeições (se houver)
        if (analysis.rejectedOpportunities && analysis.rejectedOpportunities.length > 0) {
          console.log('📊 Principais motivos de rejeição:');
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
      }

      return analysis;
      
    } catch (error) {
      console.error('❌ Erro ao analisar oportunidades:', error);
      return null;
    }
  }

  async executeBestOpportunity(opportunities) {
    if (!opportunities || opportunities.length === 0) {
      return null;
    }

    const bestOpportunity = opportunities[0];
    this.executionsAttempted++;

    console.log(`🎯 Executando melhor oportunidade:`);
    const formatted = this.arbitrageService.formatOpportunity(bestOpportunity);
    console.log(`   ${formatted.description}`);
    console.log(`   Lucro estimado: ${formatted.profit}`);
    console.log(`   Lucro líquido: ${formatted.netProfit}\n`);

    try {
      const result = await this.blockchainService.executeArbitrage(bestOpportunity);
      
      if (result.success) {
        this.executionsSuccessful++;
        console.log('✅ Arbitragem executada com sucesso!');
        console.log(`   Hash: ${result.txHash}`);
        console.log(`   Gás usado: ${result.gasUsed}`);
        console.log(`   Lucro líquido: ${result.netProfit.toFixed(2)}%\n`);
      } else {
        console.log('❌ Falha na execução da arbitragem:', result.error || result.reason, '\n');
      }

      return result;
      
    } catch (error) {
      console.error('❌ Erro ao executar arbitragem:', error, '\n');
      return { success: false, error: error.message };
    }
  }

  async runCycle() {
    try {
      // Atualizar dados de mercado
      const marketData = await this.updateMarketData();
      if (!marketData) return;

      // Analisar oportunidades
      const analysis = await this.analyzeOpportunities(marketData);
      if (!analysis) return;

      // MODO MONITORAMENTO: Apenas contar oportunidades, sem executar flash loans
      if (analysis.profitable > 0) {
        this.opportunitiesFound += analysis.profitable;
        
        console.log('📊 MODO MONITORAMENTO ATIVO - Execução de flash loans suspensa');
        console.log('🔍 Oportunidades detectadas e catalogadas para análise');
        console.log(`📈 Total de oportunidades encontradas nesta sessão: ${this.opportunitiesFound}\n`);
        
        // Log das melhores oportunidades para monitoramento
        const bestOpp = analysis.opportunities[0];
        if (bestOpp) {
          const formatted = this.arbitrageService.formatOpportunity(bestOpp);
          console.log('🎯 MELHOR OPORTUNIDADE DETECTADA (não executada):');
          console.log(`   ${formatted.description}`);
          console.log(`   Lucro estimado: ${formatted.profit}`);
          console.log(`   Lucro líquido: ${formatted.netProfit}`);
          console.log(`   Qualidade: ${formatted.quality}`);
          console.log(`   Score: ${formatted.profitabilityScore}\n`);
        }
        
        // SUSPENSO: await this.executeBestOpportunity(analysis.opportunities);
      }

    } catch (error) {
      console.error('❌ Erro no ciclo de execução:', error);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️  Bot já está em execução');
      return;
    }

    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Falha na inicialização. Encerrando...');
      return;
    }

    this.isRunning = true;
    console.log('📊 MODO MONITORAMENTO ATIVO');
    console.log('⚠️  Flash loans suspensos - Apenas detecção de oportunidades');
    console.log('� Iniciando monitoramento contínuo...\n');

    // Executar ciclo inicial
    await this.runCycle();

    // Configurar intervalos
    const updateInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(updateInterval);
        return;
      }

      const timeSinceUpdate = Date.now() - this.lastDataUpdate;
      if (timeSinceUpdate >= config.updateInterval) {
        await this.runCycle();
      }
    }, config.checkInterval);

    // Configurar graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Recebido sinal de interrupção. Encerrando...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Recebido sinal de término. Encerrando...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    this.isRunning = false;
    console.log('\n📊 Estatísticas finais (MODO MONITORAMENTO):');
    console.log(`   Oportunidades detectadas: ${this.opportunitiesFound}`);
    console.log(`   Execuções tentadas: ${this.executionsAttempted} (suspenso)`);
    console.log(`   Execuções bem-sucedidas: ${this.executionsSuccessful} (suspenso)`);
    console.log(`   Status: Monitoramento ativo - Flash loans suspensos`);
    console.log('✅ Sistema de monitoramento encerrado');
  }

  // Método para execução única (para testes)
  async runOnce() {
    console.log('🔄 Executando ciclo único...\n');
    await this.runCycle();
    console.log('✅ Ciclo único concluído');
  }
}

// Função principal
async function main() {
  const bot = new ArbitrageBot();
  
  // Verificar argumentos da linha de comando
  const args = process.argv.slice(2);
  
  if (args.includes('--once') || args.includes('-o')) {
    await bot.runOnce();
  } else {
    await bot.start();
  }
}

// Executar se for o arquivo principal
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = ArbitrageBot; 