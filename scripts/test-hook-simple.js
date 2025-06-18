#!/usr/bin/env node

/**
 * Teste Simples - Verificar se o problema está no hook ou na comunicação
 */

const axios = require('axios');

async function testSimpleCommunication() {
  console.log('🧪 Teste simples de comunicação...\n');

  const api = axios.create({
    baseURL: 'http://localhost:8080',
    timeout: 5000,
  });

  try {
    console.log('1️⃣ Testando System Health...');
    const healthResponse = await api.get('/api/system-health');
    console.log(`✅ System Health: ${healthResponse.data.status}`);
    
    console.log('2️⃣ Testando Market Stats...');
    const marketResponse = await api.get('/api/market-stats');
    console.log(`✅ Market Stats: ${marketResponse.data.market?.totalPairs || 0} pares`);
    
    console.log('3️⃣ Testando Opportunities...');
    const opportunitiesResponse = await api.get('/api/opportunities');
    console.log(`✅ Opportunities: ${opportunitiesResponse.data.opportunities?.length || 0} encontradas`);
    
    console.log('\n🎯 Todos os endpoints respondem corretamente!');
    console.log('💡 O problema está no hook useArbitrageData, não na comunicação.');
    
  } catch (error) {
    console.error('❌ Erro na comunicação:', error.message);
    console.log('💡 O problema está na comunicação com o servidor.');
  }
}

testSimpleCommunication(); 