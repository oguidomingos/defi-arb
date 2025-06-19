const GraphService = require('../src/services/graphService');
const config = require('../src/config');

async function testTheGraphConnectivity() {
  console.log('🔍 DIAGNÓSTICO: Testando conectividade real com The Graph\n');
  
  const graphService = new GraphService();
  
  // 1. Verificar configuração
  console.log('📋 CONFIGURAÇÃO:');
  console.log('API Key:', config.theGraphApiKey ? '✅ Definida' : '❌ Não definida');
  console.log('Endpoints:');
  Object.entries(config.dexSubgraphs).forEach(([name, dex]) => {
    console.log(`  ${name}: ${dex.url}`);
  });
  
  // 2. Testar cada endpoint individualmente
  console.log('\n🌐 TESTE DE CONECTIVIDADE POR ENDPOINT:\n');
  
  for (const [dexName, dexConfig] of Object.entries(config.dexSubgraphs)) {
    console.log(`--- Testando ${dexConfig.name} (${dexName}) ---`);
    
    try {
      const client = graphService.clients[dexName];
      
      // Query muito simples para testar conectividade
      const testQuery = `
        query TestConnectivity {
          _meta {
            deployment
            hasIndexingErrors
            block {
              number
              timestamp
            }
          }
        }
      `;
      
      console.log('Fazendo query _meta para testar conectividade...');
      const result = await client.query({
        query: require('@apollo/client/core').gql(testQuery),
        fetchPolicy: 'no-cache'
      });
      
      if (result.data && result.data._meta) {
        console.log('✅ ENDPOINT FUNCIONANDO!');
        console.log(`   Deployment: ${result.data._meta.deployment || 'N/A'}`);
        console.log(`   Erros de indexação: ${result.data._meta.hasIndexingErrors || false}`);
        console.log(`   Último bloco: ${result.data._meta.block?.number || 'N/A'}`);
        console.log(`   Timestamp: ${result.data._meta.block?.timestamp || 'N/A'}`);
      } else {
        console.log('⚠️ Endpoint respondeu mas sem dados _meta');
        console.log('Resposta:', JSON.stringify(result.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ ERRO DE CONECTIVIDADE:');
      console.log(`   Tipo: ${error.constructor.name}`);
      console.log(`   Mensagem: ${error.message}`);
      if (error.networkError) {
        console.log(`   Erro de rede: ${error.networkError.message}`);
      }
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.log(`   Erros GraphQL: ${JSON.stringify(error.graphQLErrors, null, 2)}`);
      }
    }
    
    console.log('');
  }
  
  // 3. Testar query real de pools
  console.log('🏊 TESTE DE QUERY REAL DE POOLS:\n');
  
  const validTokenAddresses = Object.values(config.tokens)
    .map(token => token.address)
    .filter(addr => addr && addr !== 'undefined');
  
  console.log('Tokens para query:', validTokenAddresses.slice(0, 3)); // Apenas 3 primeiros
  
  for (const [dexName, dexConfig] of Object.entries(config.dexSubgraphs)) {
    console.log(`--- Testando pools reais de ${dexConfig.name} ---`);
    
    try {
      const client = graphService.clients[dexName];
      
      // Query para buscar pools reais
      const poolsQuery = `
        query RealPools($tokens: [String!]) {
          pools(
            where: {
              token0_in: $tokens,
              token1_in: $tokens
            },
            first: 3,
            orderBy: totalValueLockedUSD,
            orderDirection: desc
          ) {
            id
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol  
              decimals
            }
            totalValueLockedUSD
            volumeUSD
            token0Price
            token1Price
          }
        }
      `;
      
      console.log('Fazendo query de pools reais...');
      const result = await client.query({
        query: require('@apollo/client/core').gql(poolsQuery),
        variables: { 
          tokens: validTokenAddresses.slice(0, 5) // Limitar para não sobrecarregar
        },
        fetchPolicy: 'no-cache'
      });
      
      if (result.data && result.data.pools) {
        const pools = result.data.pools;
        console.log(`✅ ENCONTROU ${pools.length} POOLS REAIS!`);
        
        pools.forEach((pool, idx) => {
          console.log(`   Pool ${idx + 1}:`);
          console.log(`     ID: ${pool.id}`);
          console.log(`     Par: ${pool.token0.symbol}/${pool.token1.symbol}`);
          console.log(`     TVL: $${parseFloat(pool.totalValueLockedUSD || 0).toLocaleString()}`);
          console.log(`     Preço token0: ${pool.token0Price || 'N/A'}`);
          console.log(`     Preço token1: ${pool.token1Price || 'N/A'}`);
        });
        
        if (pools.length === 0) {
          console.log('⚠️ Nenhum pool encontrado para os tokens especificados');
        }
        
      } else {
        console.log('❌ Query retornou mas sem dados de pools');
        console.log('Resposta:', JSON.stringify(result.data, null, 2));
      }
      
    } catch (error) {
      console.log('❌ ERRO NA QUERY DE POOLS:');
      console.log(`   Tipo: ${error.constructor.name}`);
      console.log(`   Mensagem: ${error.message}`);
      if (error.networkError) {
        console.log(`   Erro de rede: ${error.networkError.message}`);
      }
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        console.log(`   Erros GraphQL: ${JSON.stringify(error.graphQLErrors, null, 2)}`);
      }
    }
    
    console.log('');
  }
  
  // 4. Testar o método completo que está sendo usado
  console.log('🔄 TESTE DO MÉTODO COMPLETO getAllPoolsData():\n');
  
  try {
    console.log('Executando getAllPoolsData()...');
    const allPoolsData = await graphService.getAllPoolsData();
    
    console.log('Resultado:');
    Object.entries(allPoolsData).forEach(([dexName, pools]) => {
      console.log(`  ${dexName}: ${pools.length} pools`);
    });
    
    // Verificar se está usando dados simulados
    const totalRealPools = Object.values(allPoolsData).reduce((sum, pools) => sum + pools.length, 0);
    
    if (totalRealPools === 0) {
      console.log('❌ CONFIRMADO: Está usando dados SIMULADOS!');
      console.log('   Motivo: getAllPoolsData() retornou 0 pools reais');
    } else {
      // Verificar se os dados são realmente do blockchain
      const firstPool = Object.values(allPoolsData).flat()[0];
      if (firstPool && firstPool.id && (firstPool.id.startsWith('0x') && firstPool.id.length > 10)) {
        console.log('✅ DADOS PARECEM REAIS DO BLOCKCHAIN!');
        console.log(`   Exemplo de pool ID real: ${firstPool.id}`);
      } else {
        console.log('⚠️ DADOS SUSPEITOS - podem ser simulados');
        console.log(`   Exemplo de pool ID: ${firstPool?.id || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.log('❌ ERRO NO MÉTODO COMPLETO:');
    console.log(`   ${error.message}`);
  }
  
  console.log('\n🎯 CONCLUSÃO DO DIAGNÓSTICO:');
  console.log('1. Verifique os resultados acima');
  console.log('2. Se todos os endpoints falharam, o problema é conectividade/configuração');
  console.log('3. Se endpoints funcionam mas pools estão vazios, o problema é na query/tokens');
  console.log('4. Se encontrou pools reais, o problema é no fallback para simulação');
  
}

// Executar o teste
testTheGraphConnectivity().catch(console.error);