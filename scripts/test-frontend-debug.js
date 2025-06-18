#!/usr/bin/env node

/**
 * Script de Teste do Frontend - Debug Específico
 * 
 * Este script testa especificamente os problemas do frontend
 * e simula o comportamento do hook useArbitrageData
 */

const axios = require('axios');

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

  async simulateUseArbitrageData() {
    console.log('🧪 Simulando comportamento do useArbitrageData...\n');

    // Simular estados iniciais
    let opportunities = [];
    let marketStats = null;
    let systemHealth = null;
    let alerts = [];
    let cacheStats = null;
    let isLoading = true;
    let error = null;

    console.log('📊 Estados iniciais:');
    console.log(`   opportunities: ${opportunities.length}`);
    console.log(`   marketStats: ${marketStats ? 'carregado' : 'null'}`);
    console.log(`   systemHealth: ${systemHealth ? 'carregado' : 'null'}`);
    console.log(`   alerts: ${alerts.length}`);
    console.log(`   cacheStats: ${cacheStats ? 'carregado' : 'null'}`);
    console.log(`   isLoading: ${isLoading}`);
    console.log(`   error: ${error ? 'sim' : 'null'}`);
    console.log('');

    try {
      // Simular fetchAllData
      console.log('🔄 Executando fetchAllData...');
      
      const [opportunitiesData, marketData, healthData, alertsData, cacheData] = await Promise.allSettled([
        this.api.get('/api/opportunities'),
        this.api.get('/api/market-stats'),
        this.api.get('/api/system-health'),
        this.api.get('/api/alerts'),
        this.api.get('/api/cache-stats')
      ]);

      // Processar resultados
      console.log('📊 Processando resultados...');
      
      if (opportunitiesData.status === 'fulfilled') {
        opportunities = opportunitiesData.value.data.opportunities || [];
        console.log(`✅ Opportunities: ${opportunities.length} encontradas`);
      } else {
        console.log(`❌ Opportunities: ${opportunitiesData.reason.message}`);
      }

      if (marketData.status === 'fulfilled') {
        marketStats = marketData.value.data;
        console.log(`✅ Market Stats: carregado (${marketStats.market?.totalPairs || 0} pares)`);
      } else {
        console.log(`❌ Market Stats: ${marketData.reason.message}`);
      }

      if (healthData.status === 'fulfilled') {
        systemHealth = healthData.value.data;
        console.log(`✅ System Health: carregado (${systemHealth.status})`);
      } else {
        console.log(`❌ System Health: ${healthData.reason.message}`);
      }

      if (alertsData.status === 'fulfilled') {
        alerts = alertsData.value.data.alerts?.recentAlerts || [];
        console.log(`✅ Alerts: ${alerts.length} encontrados`);
      } else {
        console.log(`❌ Alerts: ${alertsData.reason.message}`);
      }

      if (cacheData.status === 'fulfilled') {
        cacheStats = cacheData.value.data.cache || null;
        console.log(`✅ Cache Stats: carregado (hit rate: ${cacheStats?.hitRate || 0})`);
      } else {
        console.log(`❌ Cache Stats: ${cacheData.reason.message}`);
      }

      // Finalizar loading
      isLoading = false;
      console.log('✅ Loading finalizado');

    } catch (error) {
      console.error('❌ Erro geral:', error.message);
      isLoading = false;
      error = error.message;
    }

    // Estados finais
    console.log('\n📊 Estados finais:');
    console.log(`   opportunities: ${opportunities.length}`);
    console.log(`   marketStats: ${marketStats ? 'carregado' : 'null'}`);
    console.log(`   systemHealth: ${systemHealth ? 'carregado' : 'null'}`);
    console.log(`   alerts: ${alerts.length}`);
    console.log(`   cacheStats: ${cacheStats ? 'carregado' : 'null'}`);
    console.log(`   isLoading: ${isLoading}`);
    console.log(`   error: ${error ? 'sim' : 'null'}`);

    // Computed stats
    const stats = {
      totalOpportunities: opportunities.length,
      profitableOpportunities: opportunities.filter(op => op.expectedProfit > 0).length,
      directOpportunities: opportunities.filter(op => op.type === 'direct').length,
      triangularOpportunities: opportunities.filter(op => op.type === 'triangular').length,
      avgProfit: opportunities.length > 0 
        ? opportunities.reduce((sum, op) => sum + (op.expectedProfit || 0), 0) / opportunities.length
        : 0
    };

    console.log('\n📈 Stats computados:');
    console.log(`   totalOpportunities: ${stats.totalOpportunities}`);
    console.log(`   profitableOpportunities: ${stats.profitableOpportunities}`);
    console.log(`   directOpportunities: ${stats.directOpportunities}`);
    console.log(`   triangularOpportunities: ${stats.triangularOpportunities}`);
    console.log(`   avgProfit: ${stats.avgProfit}`);

    return {
      opportunities,
      marketStats,
      systemHealth,
      alerts,
      cacheStats,
      stats,
      isLoading,
      error
    };
  }

  async testComponentRendering() {
    console.log('\n🎨 Testando renderização de componentes...\n');

    const data = await this.simulateUseArbitrageData();

    // Simular condições de renderização do App.jsx
    console.log('🔍 Verificando condições de renderização:');
    
    const showLoading = data.isLoading && !data.systemHealth && !data.marketStats && !data.opportunities.length;
    console.log(`   showLoading: ${showLoading} (${data.isLoading} && !${!!data.systemHealth} && !${!!data.marketStats} && !${data.opportunities.length})`);
    
    const showError = data.error && !data.systemHealth && !data.marketStats && !data.opportunities.length;
    console.log(`   showError: ${showError} (${!!data.error} && !${!!data.systemHealth} && !${!!data.marketStats} && !${data.opportunities.length})`);
    
    const showContent = !showLoading && !showError;
    console.log(`   showContent: ${showContent}`);

    if (showLoading) {
      console.log('⚠️  Componente mostrará LoadingSpinner');
    } else if (showError) {
      console.log('⚠️  Componente mostrará ErrorMessage');
    } else {
      console.log('✅ Componente mostrará conteúdo normal');
    }

    // Verificar se os dados estão sendo passados corretamente
    console.log('\n🔍 Verificando dados para componentes:');
    
    const dashboardProps = {
      stats: data.stats,
      marketStats: data.marketStats,
      systemHealth: data.systemHealth,
      cacheStats: data.cacheStats,
      lastUpdate: new Date().toISOString(),
      isLoading: data.isLoading
    };

    console.log('📊 Props para Dashboard:');
    Object.entries(dashboardProps).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`   ${key}: ${JSON.stringify(value).substring(0, 100)}...`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
  }

  async runAllTests() {
    console.log('🚀 Iniciando debug específico do Frontend\n');
    console.log('=' .repeat(60));
    
    await this.simulateUseArbitrageData();
    console.log('=' .repeat(60));
    
    await this.testComponentRendering();
    console.log('=' .repeat(60));
    
    console.log('\n🎯 Debug do Frontend concluído!');
    console.log('\n💡 Análise:');
    console.log('   - Se todos os dados estão sendo carregados mas o componente não renderiza,');
    console.log('     o problema pode estar na lógica de renderização do App.jsx');
    console.log('   - Verifique se isLoading está sendo definido como false corretamente');
    console.log('   - Verifique se os dados estão sendo passados para os componentes');
  }
}

// Executar o debug
const debuggerInstance = new FrontendDebugger();
debuggerInstance.runAllTests().catch(console.error); 