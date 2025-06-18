#!/usr/bin/env node

/**
 * Script de teste para o servidor Express.js
 * Testa todas as funcionalidades: API REST, WebSocket e integração com serviços
 */

const axios = require('axios');
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:8080';
const SOCKET_URL = 'ws://localhost:8080';

class ServerTester {
  constructor() {
    this.testResults = [];
    this.socket = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📝',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testEndpoint(name, url, expectedStatus = 200) {
    try {
      this.log(`Testando ${name}: ${url}`);
      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.status === expectedStatus) {
        this.log(`${name} - Status: ${response.status} ✓`, 'success');
        return { success: true, data: response.data };
      } else {
        this.log(`${name} - Status inesperado: ${response.status}`, 'error');
        return { success: false, error: `Status inesperado: ${response.status}` };
      }
    } catch (error) {
      this.log(`${name} - Erro: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testWebSocket() {
    return new Promise((resolve) => {
      this.log('Testando WebSocket...');
      
      const timeout = setTimeout(() => {
        this.log('WebSocket - Timeout na conexão', 'error');
        resolve({ success: false, error: 'Timeout na conexão' });
      }, 15000);

      try {
        this.socket = io(SOCKET_URL);
        
        this.socket.on('connect', () => {
          clearTimeout(timeout);
          this.log('WebSocket - Conectado com sucesso', 'success');
          
          // Escutar por atualizações
          this.socket.on('opportunities_update', (data) => {
            this.log(`WebSocket - Recebido opportunities_update: ${data.stats.total} oportunidades`, 'success');
          });
          
          this.socket.on('market_stats', (data) => {
            this.log(`WebSocket - Recebido market_stats: Gas ${data.gasPrice}`, 'success');
          });
          
          this.socket.on('system_status', (data) => {
            this.log(`WebSocket - Status do sistema: ${data.isRunning ? 'Ativo' : 'Inativo'}`, 'success');
          });
          
          setTimeout(() => {
            resolve({ success: true });
          }, 5000);
        });
        
        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          this.log(`WebSocket - Erro de conexão: ${error.message}`, 'error');
          resolve({ success: false, error: error.message });
        });
        
      } catch (error) {
        clearTimeout(timeout);
        this.log(`WebSocket - Erro: ${error.message}`, 'error');
        resolve({ success: false, error: error.message });
      }
    });
  }

  async waitForServer(maxAttempts = 10) {
    this.log('Aguardando servidor inicializar...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`${SERVER_URL}/api/system-health`, { timeout: 5000 });
        this.log('Servidor está respondendo!', 'success');
        return true;
      } catch (error) {
        this.log(`Tentativa ${i + 1}/${maxAttempts} - Servidor não está pronto`, 'warning');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    this.log('Servidor não iniciou no tempo esperado', 'error');
    return false;
  }

  async runAllTests() {
    console.log('\n🧪 ======================================');
    console.log('     INICIANDO TESTES DO SERVIDOR');
    console.log('======================================\n');

    // Aguardar servidor estar pronto
    const serverReady = await this.waitForServer();
    if (!serverReady) {
      this.log('Testes abortados - servidor não está disponível', 'error');
      return;
    }

    const tests = [
      // Testes da API REST
      { name: 'System Health', url: `${SERVER_URL}/api/system-health` },
      { name: 'Opportunities', url: `${SERVER_URL}/api/opportunities` },
      { name: 'Market Stats', url: `${SERVER_URL}/api/market-stats` },
      { name: 'Alerts', url: `${SERVER_URL}/api/alerts` },
      { name: 'Cache Stats', url: `${SERVER_URL}/api/cache-stats` }
    ];

    this.log('\n🌐 TESTANDO ENDPOINTS DA API REST\n');
    
    for (const test of tests) {
      const result = await this.testEndpoint(test.name, test.url);
      this.testResults.push({ ...test, ...result });
      
      if (result.success && result.data) {
        this.logEndpointDetails(test.name, result.data);
      }
      
      console.log(''); // Linha em branco para melhor legibilidade
    }

    // Teste WebSocket
    this.log('\n🔌 TESTANDO WEBSOCKET\n');
    const wsResult = await this.testWebSocket();
    this.testResults.push({ name: 'WebSocket', ...wsResult });

    // Aguardar mais alguns dados em tempo real
    if (wsResult.success) {
      this.log('Aguardando dados em tempo real por 30 segundos...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    // Fechar conexão WebSocket
    if (this.socket) {
      this.socket.disconnect();
      this.log('WebSocket desconectado');
    }

    // Resumo dos resultados
    this.printTestSummary();
  }

  logEndpointDetails(name, data) {
    switch (name) {
      case 'System Health':
        this.log(`  Uptime: ${Math.round(data.uptime)}s`, 'info');
        this.log(`  Serviços online: ${Object.values(data.services).filter(s => s === 'online').length}`, 'info');
        break;
      
      case 'Opportunities':
        this.log(`  Total: ${data.stats?.total || 0} oportunidades`, 'info');
        this.log(`  Diretas: ${data.stats?.direct || 0}`, 'info');
        this.log(`  Triangulares: ${data.stats?.triangular || 0}`, 'info');
        break;
      
      case 'Market Stats':
        this.log(`  Pares totais: ${data.market?.totalPairs || 0}`, 'info');
        this.log(`  Qualidade: ${data.market?.dataQuality || 'N/A'}%`, 'info');
        break;
      
      case 'Alerts':
        this.log(`  Total alertas: ${data.alerts?.total || 0}`, 'info');
        this.log(`  Status: ${data.alerts?.enabled ? 'Habilitado' : 'Desabilitado'}`, 'info');
        break;
      
      case 'Cache Stats':
        this.log(`  Cache hits: ${data.cache?.totalHits || 0}`, 'info');
        this.log(`  Cache misses: ${data.cache?.totalMisses || 0}`, 'info');
        break;
    }
  }

  printTestSummary() {
    console.log('\n📊 ======================================');
    console.log('         RESUMO DOS TESTES');
    console.log('======================================');
    
    const successful = this.testResults.filter(t => t.success).length;
    const total = this.testResults.length;
    
    console.log(`✅ Sucessos: ${successful}/${total}`);
    console.log(`❌ Falhas: ${total - successful}/${total}`);
    
    if (total - successful > 0) {
      console.log('\n❌ TESTES FALHARAM:');
      this.testResults
        .filter(t => !t.success)
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }
    
    console.log('\n======================================');
    
    if (successful === total) {
      console.log('🎉 TODOS OS TESTES PASSARAM!');
      console.log('✅ Servidor está funcionando perfeitamente!');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM');
      console.log('🔧 Verifique os logs para mais detalhes');
    }
    
    console.log('======================================\n');
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const tester = new ServerTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  });
}

module.exports = ServerTester;