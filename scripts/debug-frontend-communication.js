#!/usr/bin/env node

/**
 * Script de Debug - Comunicação Frontend/Backend
 * 
 * Este script testa a comunicação entre o frontend e o backend
 * para identificar problemas de conectividade e dados.
 */

const axios = require('axios');
const { io } = require('socket.io-client');

class FrontendDebugger {
  constructor() {
    this.baseURL = 'http://localhost:8080';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async testHttpEndpoints() {
    console.log('🔍 Testando endpoints HTTP...\n');

    const endpoints = [
      { name: 'System Health', path: '/api/system-health' },
      { name: 'Opportunities', path: '/api/opportunities' },
      { name: 'Market Stats', path: '/api/market-stats' },
      { name: 'Alerts', path: '/api/alerts' },
      { name: 'Cache Stats', path: '/api/cache-stats' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Testando ${endpoint.name}...`);
        const response = await this.api.get(endpoint.path);
        
        console.log(`✅ ${endpoint.name}: OK`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
        console.log('');
      } catch (error) {
        console.log(`❌ ${endpoint.name}: FALHOU`);
        console.log(`   Erro: ${error.message}`);
        if (error.response) {
          console.log(`   Status: ${error.response.status}`);
          console.log(`   Data:`, error.response.data);
        }
        console.log('');
      }
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testando conexão WebSocket...\n');

    return new Promise((resolve) => {
      const socket = io(this.baseURL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false,
      });

      let eventsReceived = 0;
      const maxWaitTime = 10000; // 10 segundos
      const startTime = Date.now();

      socket.on('connect', () => {
        console.log('✅ WebSocket conectado com sucesso');
        console.log(`   Socket ID: ${socket.id}`);
        console.log(`   Transport: ${socket.io.engine.transport.name}`);
      });

      socket.on('disconnect', (reason) => {
        console.log(`❌ WebSocket desconectado: ${reason}`);
      });

      socket.on('connect_error', (error) => {
        console.log(`❌ Erro de conexão WebSocket: ${error.message}`);
      });

      // Eventos esperados do servidor
      const expectedEvents = [
        'opportunities_update',
        'market_stats', 
        'system_status',
        'analysis_error'
      ];

      expectedEvents.forEach(event => {
        socket.on(event, (data) => {
          eventsReceived++;
          console.log(`📡 Evento recebido: ${event}`);
          console.log(`   Data:`, JSON.stringify(data, null, 2).substring(0, 150) + '...');
        });
      });

      // Timeout para finalizar o teste
      setTimeout(() => {
        console.log(`\n📊 Resumo WebSocket:`);
        console.log(`   Eventos recebidos: ${eventsReceived}/${expectedEvents.length}`);
        console.log(`   Tempo de espera: ${Date.now() - startTime}ms`);
        
        socket.disconnect();
        resolve();
      }, maxWaitTime);
    });
  }

  async testFrontendEnvironment() {
    console.log('🌐 Testando ambiente do frontend...\n');

    // Simular as chamadas que o frontend faria
    try {
      console.log('📡 Simulando chamadas do useArbitrageData...');
      
      // Teste 1: Buscar oportunidades
      console.log('1️⃣ Testando fetchOpportunities...');
      const opportunitiesResponse = await this.api.get('/api/opportunities');
      console.log(`   ✅ Oportunidades: ${opportunitiesResponse.data.opportunities?.length || 0} encontradas`);
      
      // Teste 2: Buscar market stats
      console.log('2️⃣ Testando fetchMarketStats...');
      const marketResponse = await this.api.get('/api/market-stats');
      console.log(`   ✅ Market Stats: ${marketResponse.data.market?.totalPairs || 0} pares`);
      
      // Teste 3: Buscar system health
      console.log('3️⃣ Testando fetchSystemHealth...');
      const healthResponse = await this.api.get('/api/system-health');
      console.log(`   ✅ System Health: ${healthResponse.data.status}`);
      
      // Teste 4: Buscar alertas
      console.log('4️⃣ Testando fetchAlerts...');
      const alertsResponse = await this.api.get('/api/alerts');
      console.log(`   ✅ Alertas: ${alertsResponse.data.alerts?.recentAlerts?.length || 0} recentes`);
      
      // Teste 5: Buscar cache stats
      console.log('5️⃣ Testando fetchCacheStats...');
      const cacheResponse = await this.api.get('/api/cache-stats');
      console.log(`   ✅ Cache Stats: ${cacheResponse.data.cache?.hitRate || 0} hit rate`);
      
      console.log('\n✅ Todos os endpoints respondem corretamente!');
      
    } catch (error) {
      console.log(`❌ Erro ao testar endpoints: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Iniciando debug da comunicação Frontend/Backend\n');
    console.log('=' .repeat(60));
    
    await this.testHttpEndpoints();
    console.log('=' .repeat(60));
    
    await this.testWebSocketConnection();
    console.log('=' .repeat(60));
    
    await this.testFrontendEnvironment();
    console.log('=' .repeat(60));
    
    console.log('\n🎯 Debug concluído!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Verifique se o frontend está acessando http://localhost:3001');
    console.log('   2. Abra o DevTools do navegador (F12)');
    console.log('   3. Verifique a aba Console para erros');
    console.log('   4. Verifique a aba Network para requisições falhando');
  }
}

// Executar o debug
const debuggerInstance = new FrontendDebugger();
debuggerInstance.runAllTests().catch(console.error); 