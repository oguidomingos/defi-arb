require('dotenv').config({ path: '../.env' });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');

// Import dos serviços existentes
const config = require('../src/config');
const ArbitrageService = require('../src/services/arbitrageService');
const GraphService = require('../src/services/graphService');
const { TriangularArbitrageService } = require('../src/services/triangularArbitrageService');
const CacheManager = require('../src/services/cacheManager');
const BlockchainService = require('../src/services/blockchainService');

class DefiArbitrageServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    // Estado do sistema
    this.systemState = {
      isRunning: false,
      lastUpdate: null,
      connectedClients: 0,
      totalOpportunities: 0,
      totalAlerts: 0
    };
    
    // Inicialização dos serviços
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.startMonitoring();
  }

  initializeServices() {
    console.log('🔧 Inicializando serviços...');
    
    try {
      this.cacheManager = new CacheManager();
      this.graphService = new GraphService();

      // BlockchainService deve ser inicializado antes dos demais
      this.blockchainService = new BlockchainService();
      this.blockchainService.initializeFlashLoanContract();

      this.arbitrageService = new ArbitrageService(this.blockchainService);
      this.triangularArbitrageService = new TriangularArbitrageService(this.blockchainService);
      
      console.log('✅ Todos os serviços inicializados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar serviços:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Middleware de segurança e performance
    this.app.use(helmet());
    this.app.use(compression());
    
    // CORS para permitir requisições do frontend
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Parsing de JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    this.app.use(morgan('combined'));
  }

  setupRoutes() {
    console.log('🛣️  Configurando rotas da API...');
    
    // Rota de saúde do sistema
    this.app.get('/api/system-health', (req, res) => {
      try {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            cache: this.cacheManager ? 'online' : 'offline',
            graph: this.graphService ? 'online' : 'offline',
            arbitrage: this.arbitrageService ? 'online' : 'offline',
            triangular: this.triangularArbitrageService ? 'online' : 'offline',
            blockchain: this.blockchainService ? 'online' : 'offline'
          },
          system: this.systemState,
          memory: process.memoryUsage(),
          version: require('../package.json').version
        };
        
        res.json(health);
      } catch (error) {
        console.error('❌ Erro na verificação de saúde:', error);
        res.status(500).json({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para oportunidades atuais
    this.app.get('/api/opportunities', async (req, res) => {
      try {
        console.log('📊 Solicitação de oportunidades recebida');
        
        // Obter dados atualizados do GraphService
        const tokenPrices = await this.graphService.getUpdatedData();
        
        if (!tokenPrices || Object.keys(tokenPrices).length === 0) {
          return res.json({
            success: false,
            message: 'Nenhum dado de preço disponível',
            opportunities: [],
            timestamp: new Date().toISOString()
          });
        }

        // Obter preço atual do gás
        const gasPrice = await this.blockchainService.getGasPrice();
        
        // Analisar oportunidades de arbitragem
        const directOpportunities = this.arbitrageService.analyzeOpportunities(tokenPrices, gasPrice);
        const triangularOpportunities = this.triangularArbitrageService.detectOpportunities(tokenPrices.tokenPrices || tokenPrices);
        
        // Converter oportunidades triangulares para formato compatível
        const convertedTriangularOpportunities = triangularOpportunities.opportunities.map(opp => ({
          type: 'triangular',
          tokenA: opp.tokens?.[0] || 'TOKEN_A',
          tokenB: opp.tokens?.[1] || 'TOKEN_B',
          tokenC: opp.tokens?.[2] || 'TOKEN_C',
          tokens: opp.tokens,
          dexA: opp.dexs?.[0] || 'unknown',
          dexB: opp.dexs?.[1] || 'unknown',
          dexC: opp.dexs?.[2] || 'unknown',
          dexs: opp.dexs,
          expectedProfit: opp.profitPercent || 0,
          profitPercentage: opp.profitPercent || 0,
          netProfit: opp.netProfit || opp.profitPercent || 0,
          volume: opp.totalVolume || 1000,
          amount: opp.totalVolume || 1000,
          minLiquidity: opp.minLiquidity,
          quality: opp.quality,
          timestamp: opp.timestamp,
          path: opp.path,
          cycle: opp.cycle
        }));
        
        const allOpportunities = [
          ...directOpportunities.opportunities,
          ...convertedTriangularOpportunities
        ];

        this.systemState.totalOpportunities = allOpportunities.length;
        this.systemState.lastUpdate = new Date().toISOString();

        const response = {
          success: true,
          opportunities: allOpportunities,
          stats: {
            total: allOpportunities.length,
            direct: directOpportunities.opportunities.length,
            triangular: triangularOpportunities.opportunities.length,
            profitable: allOpportunities.filter(op => op.expectedProfit > 0).length
          },
          marketData: {
            gasPrice: gasPrice.toString(),
            totalPairs: Object.keys(tokenPrices).length
          },
          timestamp: new Date().toISOString()
        };

        console.log(`✅ Retornando ${allOpportunities.length} oportunidades`);
        res.json(response);
        
      } catch (error) {
        console.error('❌ Erro ao buscar oportunidades:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          opportunities: [],
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para estatísticas do mercado
    this.app.get('/api/market-stats', async (req, res) => {
      try {
        console.log('📈 Solicitação de estatísticas do mercado');
        
        const tokenPrices = await this.graphService.getUpdatedData();
        const gasPrice = await this.blockchainService.getGasPrice();
        const networkInfo = await this.blockchainService.getNetworkInfo();
        
        const marketValidation = this.graphService.validateMarketData(tokenPrices);
        
        const stats = {
          market: {
            totalPairs: Object.keys(tokenPrices).length,
            validPairs: marketValidation.validPairs,
            suspiciousPairs: marketValidation.suspiciousPairs.length,
            dataQuality: marketValidation.dataQuality
          },
          network: {
            gasPrice: gasPrice.toString(),
            chainId: networkInfo.chainId,
            blockNumber: networkInfo.blockNumber
          },
          cache: this.cacheManager.getStats(),
          system: this.systemState,
          timestamp: new Date().toISOString()
        };

        res.json(stats);
        
      } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para alertas ativos
    this.app.get('/api/alerts', (req, res) => {
      try {
        const alertStats = this.arbitrageService.alertEngine.getStats();
        
        const response = {
          success: true,
          alerts: {
            total: alertStats.totalAlerts,
            byType: alertStats.alertsByType,
            recentAlerts: alertStats.recentAlerts || [],
            enabled: alertStats.enabled
          },
          timestamp: new Date().toISOString()
        };
        
        res.json(response);
        
      } catch (error) {
        console.error('❌ Erro ao buscar alertas:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Endpoint para estatísticas do cache
    this.app.get('/api/cache-stats', (req, res) => {
      try {
        const cacheStats = this.cacheManager.getStats();
        
        res.json({
          success: true,
          cache: cacheStats,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('❌ Erro ao buscar estatísticas do cache:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Rota 404 para API - removida temporariamente para evitar problemas com path-to-regexp
    this.app.use((req, res, next) => {
      if (req.path.startsWith('/api') && !res.headersSent) {
        res.status(404).json({
          success: false,
          error: 'Endpoint não encontrado',
          path: req.path,
          timestamp: new Date().toISOString()
        });
      } else {
        next();
      }
    });
  }

  setupWebSocket() {
    console.log('🔌 Configurando WebSocket...');
    
    this.io.on('connection', (socket) => {
      this.systemState.connectedClients++;
      console.log(`👤 Cliente conectado (${this.systemState.connectedClients} total)`);
      
      // Enviar estado inicial
      socket.emit('system_status', this.systemState);
      
      socket.on('disconnect', () => {
        this.systemState.connectedClients--;
        console.log(`👤 Cliente desconectado (${this.systemState.connectedClients} total)`);
      });
    });
  }

  async startMonitoring() {
    console.log('🔄 Iniciando monitoramento contínuo...');
    
    this.systemState.isRunning = true;
    
    // Executar análise inicial
    await this.runAnalysis();
    
    // Configurar intervalo de 30 segundos
    this.monitoringInterval = setInterval(async () => {
      await this.runAnalysis();
    }, 30000);
    
    console.log('✅ Monitoramento iniciado (análises a cada 30 segundos)');
  }

  async runAnalysis() {
    try {
      console.log('🔍 Executando análise de oportunidades...');
      
      // Obter dados atualizados
      const tokenPrices = await this.graphService.getUpdatedData();
      
      if (!tokenPrices || Object.keys(tokenPrices).length === 0) {
        console.log('⚠️  Nenhum dado de preço disponível');
        return;
      }

      const gasPrice = await this.blockchainService.getGasPrice();
      
      // Executar análises
      const directResults = this.arbitrageService.analyzeOpportunities(tokenPrices, gasPrice);
      const triangularResults = this.triangularArbitrageService.detectOpportunities(tokenPrices.tokenPrices || tokenPrices);
      
      // Converter oportunidades triangulares para formato compatível
      const convertedTriangularOpportunities = triangularResults.opportunities.map(opp => ({
        type: 'triangular',
        tokenA: opp.tokens?.[0] || 'TOKEN_A',
        tokenB: opp.tokens?.[1] || 'TOKEN_B',
        tokenC: opp.tokens?.[2] || 'TOKEN_C',
        tokens: opp.tokens,
        dexA: opp.dexs?.[0] || 'unknown',
        dexB: opp.dexs?.[1] || 'unknown',
        dexC: opp.dexs?.[2] || 'unknown',
        dexs: opp.dexs,
        expectedProfit: opp.profitPercent || 0,
        profitPercentage: opp.profitPercent || 0,
        netProfit: opp.netProfit || opp.profitPercent || 0,
        volume: opp.totalVolume || 1000,
        amount: opp.totalVolume || 1000,
        minLiquidity: opp.minLiquidity,
        quality: opp.quality,
        timestamp: opp.timestamp,
        path: opp.path,
        cycle: opp.cycle
      }));
      
      const allOpportunities = [
        ...directResults.opportunities,
        ...convertedTriangularOpportunities
      ];

      // Atualizar estado do sistema
      this.systemState.totalOpportunities = allOpportunities.length;
      this.systemState.lastUpdate = new Date().toISOString();

      // Emitir atualizações via WebSocket
      if (this.systemState.connectedClients > 0) {
        this.io.emit('opportunities_update', {
          opportunities: allOpportunities,
          stats: {
            total: allOpportunities.length,
            direct: directResults.opportunities.length,
            triangular: triangularResults.opportunities.length,
            profitable: allOpportunities.filter(op => op.expectedProfit > 0).length
          },
          timestamp: new Date().toISOString()
        });

        // Emitir estatísticas de mercado
        this.io.emit('market_stats', {
          gasPrice: gasPrice.toString(),
          totalPairs: Object.keys(tokenPrices).length,
          cacheStats: this.cacheManager.getStats(),
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Análise concluída: ${allOpportunities.length} oportunidades encontradas`);
      
    } catch (error) {
      console.error('❌ Erro durante análise:', error);
      
      // Emitir erro via WebSocket
      if (this.systemState.connectedClients > 0) {
        this.io.emit('analysis_error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  start(port = 8080) {
    this.server.listen(port, () => {
      console.log('\n🚀 ======================================');
      console.log('   DeFi Arbitrage Server INICIADO!');
      console.log('======================================');
      console.log(`🌐 API REST: http://localhost:${port}/api`);
      console.log(`🔌 WebSocket: ws://localhost:${port}`);
      console.log('======================================');
      console.log('📊 Endpoints disponíveis:');
      console.log('   GET /api/opportunities');
      console.log('   GET /api/market-stats');
      console.log('   GET /api/alerts');
      console.log('   GET /api/cache-stats');
      console.log('   GET /api/system-health');
      console.log('======================================');
      console.log('🔄 Monitoramento: Ativo (30s intervalo)');
      console.log('✅ Servidor pronto para conexões!\n');
    });
  }

  stop() {
    console.log('🛑 Parando servidor...');
    
    this.systemState.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.server.close(() => {
      console.log('✅ Servidor parado com sucesso');
    });
  }
}

// Inicializar e iniciar o servidor
if (require.main === module) {
  const server = new DefiArbitrageServer();
  const port = process.env.PORT || 8080;
  
  server.start(port);
  
  // Graceful shutdown
  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());
}

module.exports = DefiArbitrageServer;