#!/usr/bin/env node

require('dotenv').config();
const config = require('../src/config');

console.log('🔍 ANÁLISE DAS API KEYS DO THE GRAPH');
console.log('=====================================');

// 1. Verificar se a API key está sendo carregada
console.log('1. VARIÁVEL DE AMBIENTE:');
console.log(`   THE_GRAPH_API_KEY: ${process.env.THE_GRAPH_API_KEY ? 'DEFINIDA' : 'UNDEFINED'}`);
console.log(`   Valor: ${process.env.THE_GRAPH_API_KEY || 'N/A'}`);
console.log(`   Comprimento: ${process.env.THE_GRAPH_API_KEY?.length || 0} caracteres`);

console.log('\n2. CONFIGURAÇÃO CARREGADA:');
console.log(`   config.theGraphApiKey: ${config.theGraphApiKey ? 'DEFINIDA' : 'UNDEFINED'}`);
console.log(`   Valor: ${config.theGraphApiKey || 'N/A'}`);

console.log('\n3. URLs DOS SUBGRAPHS:');
Object.entries(config.dexSubgraphs).forEach(([dexName, dexConfig]) => {
  console.log(`   ${dexName}:`);
  console.log(`     URL: ${dexConfig.url}`);
  console.log(`     Contém API key na URL: ${dexConfig.url.includes(config.theGraphApiKey) ? 'SIM ❌' : 'NÃO ✅'}`);
});

console.log('\n4. DIAGNÓSTICO:');
if (config.theGraphApiKey) {
  console.log('✅ API Key está definida');
  
  // Verificar se as URLs estão corretas
  const hasApiKeyInUrl = Object.values(config.dexSubgraphs).some(dex => 
    dex.url.includes(config.theGraphApiKey)
  );
  
  if (hasApiKeyInUrl) {
    console.log('❌ PROBLEMA ENCONTRADO: API key está na URL');
    console.log('   The Graph Gateway espera API key apenas no header Authorization');
    console.log('   URLs devem usar endpoints públicos, autenticação via header');
  } else {
    console.log('✅ URLs estão corretas (sem API key embutida)');
  }
} else {
  console.log('❌ API Key não está definida');
}

console.log('\n5. FORMATO CORRETO:');
console.log('   URL: https://gateway.thegraph.com/api/subgraphs/id/[SUBGRAPH_ID]');
console.log('   Header: Authorization: Bearer [API_KEY]');

console.log('\n6. TESTE DE CONECTIVIDADE:');
const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');

async function testApiKey() {
  if (!config.theGraphApiKey) {
    console.log('❌ Não é possível testar - API key não definida');
    return;
  }

  // URL correta (sem API key embutida)
  const correctUrl = 'https://gateway.thegraph.com/api/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm';
  
  const client = new ApolloClient({
    uri: correctUrl,
    cache: new InMemoryCache(),
    fetch,
    headers: {
      'Authorization': `Bearer ${config.theGraphApiKey}`
    }
  });

  const testQuery = gql`
    query TestConnection {
      pools(first: 1) {
        id
      }
    }
  `;

  try {
    console.log('   Testando conexão com URL correta...');
    const { data } = await client.query({
      query: testQuery,
      fetchPolicy: 'no-cache'
    });
    
    if (data && data.pools) {
      console.log('✅ API key funciona corretamente!');
      console.log(`   Retornou ${data.pools.length} pool(s)`);
    } else {
      console.log('⚠️  Resposta inesperada do GraphQL');
    }
  } catch (error) {
    console.log('❌ Erro na conexão:');
    console.log(`   ${error.message}`);
    
    if (error.message.includes('malformed API key')) {
      console.log('   → Confirma que o problema é formato da API key');
    } else if (error.message.includes('auth')) {
      console.log('   → Problema de autenticação');
    }
  }
}

testApiKey().catch(console.error);