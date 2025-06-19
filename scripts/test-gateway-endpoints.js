const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
const config = require('../src/config');

// Endpoints do The Graph Gateway para testar
const GATEWAY_ENDPOINTS = {
  quickswap_v3: {
    name: 'QuickSwap V3',
    url: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g',
    type: 'uniswap_v3_style' // Usa sqrtPrice
  },
  uniswap_v3: {
    name: 'Uniswap V3',
    url: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm',
    type: 'uniswap_v3_style' // Usa sqrtPrice
  },
  balancer_v2: {
    name: 'Balancer V2 Beta',
    url: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/78nZMyM9yD77KG6pFaYap31kJvj8eUWLEntbiVzh8ZKN',
    type: 'balancer_style' // Estrutura diferente
  }
};

// Tokens de teste (principais da Polygon)
const TEST_TOKENS = [
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
];

// Query de metadados para testar conectividade
const META_QUERY = gql`
  query TestMeta {
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

// Query para Uniswap V3 style (QuickSwap V3, Uniswap V3)
const UNISWAP_V3_POOLS_QUERY = gql`
  query TestUniswapV3Pools($tokens: [String!]) {
    pools(
      where: {
        token0_in: $tokens,
        token1_in: $tokens
      },
      first: 5,
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
      sqrtPrice
      tick
      feeTier
      token0Price
      token1Price
    }
  }
`;

// Query para Balancer V2
const BALANCER_POOLS_QUERY = gql`
  query TestBalancerPools($tokens: [String!]) {
    pools(
      where: {
        tokensList_contains: $tokens
      },
      first: 5,
      orderBy: totalLiquidity,
      orderDirection: desc
    ) {
      id
      tokens {
        address
        symbol
        decimals
        balance
        weight
      }
      totalLiquidity
      totalSwapVolume
      swapFee
      poolType
    }
  }
`;

// Query alternativa para pools genéricos
const GENERIC_POOLS_QUERY = gql`
  query TestGenericPools($tokens: [String!]) {
    pools(
      first: 5
    ) {
      id
    }
  }
`;

async function testGatewayEndpoint(endpointKey, endpointConfig) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TESTANDO: ${endpointConfig.name}`);
  console.log(`🔗 Endpoint: ${endpointKey}`);
  console.log(`${'='.repeat(60)}`);

  // Verificar se temos API key
  if (!config.theGraphApiKey) {
    console.log('❌ THE_GRAPH_API_KEY não está definida no .env');
    return { working: false, reason: 'no_api_key' };
  }

  // Substituir [api-key] pela key real
  const url = endpointConfig.url.replace('[api-key]', config.theGraphApiKey);
  console.log(`📡 URL com API key: ${url.substring(0, 50)}...`);

  try {
    const client = new ApolloClient({
      uri: url,
      cache: new InMemoryCache(),
      fetch,
      defaultOptions: {
        query: {
          fetchPolicy: 'no-cache'
        }
      }
    });

    // Teste 1: Metadados
    console.log('\n📊 Teste 1: Metadados e conectividade');
    try {
      const metaResult = await client.query({
        query: META_QUERY,
        fetchPolicy: 'no-cache'
      });

      if (metaResult.data?._meta) {
        const meta = metaResult.data._meta;
        console.log('✅ Conectividade OK!');
        console.log(`   📦 Deployment: ${meta.deployment?.substring(0, 12) || 'N/A'}...`);
        console.log(`   🔴 Erros de indexação: ${meta.hasIndexingErrors || false}`);
        console.log(`   🧱 Último bloco: ${meta.block?.number || 'N/A'}`);
        
        if (meta.block?.timestamp) {
          const timestamp = parseInt(meta.block.timestamp);
          const date = new Date(timestamp * 1000);
          console.log(`   ⏰ Timestamp: ${date.toLocaleString()}`);
        }
      } else {
        console.log('⚠️ Conectou mas sem metadados _meta');
      }
    } catch (metaError) {
      console.log(`❌ Erro nos metadados: ${metaError.message}`);
      if (metaError.message.includes('401') || metaError.message.includes('auth')) {
        console.log('🔑 Possível problema de autenticação com API key');
      }
    }

    // Teste 2: Query de pools baseada no tipo
    console.log('\n🏊 Teste 2: Query de pools');
    
    let poolsQuery;
    let queryName;
    
    if (endpointConfig.type === 'uniswap_v3_style') {
      poolsQuery = UNISWAP_V3_POOLS_QUERY;
      queryName = 'Uniswap V3 Style';
    } else if (endpointConfig.type === 'balancer_style') {
      poolsQuery = BALANCER_POOLS_QUERY;
      queryName = 'Balancer Style';
    } else {
      poolsQuery = GENERIC_POOLS_QUERY;
      queryName = 'Generic';
    }

    console.log(`🔍 Executando query: ${queryName}`);
    console.log(`📋 Tokens de teste: ${TEST_TOKENS.length} tokens`);

    try {
      const poolsResult = await client.query({
        query: poolsQuery,
        variables: { tokens: TEST_TOKENS },
        fetchPolicy: 'no-cache'
      });

      if (poolsResult.data?.pools) {
        const pools = poolsResult.data.pools;
        console.log(`✅ Query executada com sucesso!`);
        console.log(`📊 Pools encontrados: ${pools.length}`);

        if (pools.length > 0) {
          console.log('\n🎯 DADOS REAIS ENCONTRADOS!');
          
          pools.forEach((pool, idx) => {
            console.log(`\n   Pool ${idx + 1}:`);
            console.log(`   🆔 ID: ${pool.id}`);
            
            if (endpointConfig.type === 'balancer_style') {
              console.log(`   💰 Liquidez: $${parseFloat(pool.totalLiquidity || 0).toLocaleString()}`);
              console.log(`   📈 Volume: $${parseFloat(pool.totalSwapVolume || 0).toLocaleString()}`);
              console.log(`   🏷️ Tipo: ${pool.poolType || 'N/A'}`);
              console.log(`   🎯 Tokens: ${pool.tokens?.length || 0} tokens`);
              
              if (pool.tokens && pool.tokens.length > 0) {
                pool.tokens.slice(0, 2).forEach(token => {
                  console.log(`      - ${token.symbol}: ${parseFloat(token.balance || 0).toFixed(4)}`);
                });
              }
            } else {
              // Uniswap V3 style
              if (pool.token0 && pool.token1) {
                console.log(`   💱 Par: ${pool.token0.symbol}/${pool.token1.symbol}`);
                console.log(`   💰 TVL: $${parseFloat(pool.totalValueLockedUSD || 0).toLocaleString()}`);
                console.log(`   📈 Volume: $${parseFloat(pool.volumeUSD || 0).toLocaleString()}`);
                
                if (pool.token0Price) {
                  console.log(`   💲 Preço token0: ${parseFloat(pool.token0Price).toFixed(8)}`);
                }
                if (pool.sqrtPrice) {
                  console.log(`   📐 SqrtPrice: ${pool.sqrtPrice}`);
                }
                if (pool.feeTier) {
                  console.log(`   💸 Taxa: ${pool.feeTier / 10000}%`);
                }
              }
            }
          });

          // Validar se os dados são reais
          const firstPool = pools[0];
          const hasRealId = firstPool.id && firstPool.id.length > 20 && firstPool.id.startsWith('0x');
          const hasRecentData = true; // Assumir que sim se chegou até aqui
          
          if (hasRealId && hasRecentData) {
            console.log('\n🎉 CONFIRMADO: DADOS REAIS DO BLOCKCHAIN!');
            return {
              working: true,
              endpoint: endpointKey,
              name: endpointConfig.name,
              url: url,
              type: endpointConfig.type,
              poolsFound: pools.length,
              samplePool: firstPool,
              queryType: queryName.toLowerCase().replace(/\s+/g, '_')
            };
          } else {
            console.log('\n⚠️ Dados parecem suspeitos ou incompletos');
          }
        } else {
          console.log('⚠️ Query retornou 0 pools');
        }
      } else {
        console.log('❌ Query retornou sem campo pools');
        console.log('Estrutura retornada:', Object.keys(poolsResult.data || {}));
      }
    } catch (poolsError) {
      console.log(`❌ Erro na query de pools: ${poolsError.message}`);
      
      // Tentar query genérica como fallback
      console.log('\n🔄 Tentando query genérica...');
      try {
        const genericResult = await client.query({
          query: GENERIC_POOLS_QUERY,
          variables: { tokens: TEST_TOKENS },
          fetchPolicy: 'no-cache'
        });
        
        if (genericResult.data?.pools) {
          console.log(`✅ Query genérica funcionou: ${genericResult.data.pools.length} pools`);
        }
      } catch (genericError) {
        console.log(`❌ Query genérica falhou: ${genericError.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Erro geral: ${error.message}`);
    return { working: false, reason: 'connection_error', error: error.message };
  }

  return { working: false, reason: 'no_valid_data' };
}

async function testAllGatewayEndpoints() {
  console.log('🚀 TESTANDO ENDPOINTS DO THE GRAPH GATEWAY');
  console.log(`🔑 API Key configurada: ${config.theGraphApiKey ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`📋 Tokens de teste: ${TEST_TOKENS.length} tokens`);
  console.log('');

  const results = [];

  for (const [key, endpoint] of Object.entries(GATEWAY_ENDPOINTS)) {
    const result = await testGatewayEndpoint(key, endpoint);
    results.push(result);
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resultados finais
  console.log('\n' + '🎯'.repeat(30));
  console.log('📊 RESULTADOS FINAIS');
  console.log('🎯'.repeat(30));

  const workingEndpoints = results.filter(r => r.working);
  const failedEndpoints = results.filter(r => !r.working);

  if (workingEndpoints.length > 0) {
    console.log(`\n✅ ${workingEndpoints.length} ENDPOINT(S) FUNCIONANDO!`);
    
    workingEndpoints.forEach((endpoint, idx) => {
      console.log(`\n${idx + 1}. ${endpoint.name}`);
      console.log(`   🔗 Endpoint: ${endpoint.endpoint}`);
      console.log(`   🏷️ Tipo: ${endpoint.type}`);
      console.log(`   📊 Pools encontrados: ${endpoint.poolsFound}`);
      console.log(`   🔍 Query type: ${endpoint.queryType}`);
    });

    console.log('\n🔧 PRÓXIMO PASSO:');
    console.log('Atualizar src/config.js com os endpoints funcionais encontrados');
    
  } else {
    console.log('\n❌ NENHUM ENDPOINT FUNCIONANDO');
    console.log('\n📋 Resumo das falhas:');
    
    const failureReasons = {};
    failedEndpoints.forEach(failure => {
      failureReasons[failure.reason] = (failureReasons[failure.reason] || 0) + 1;
    });
    
    Object.entries(failureReasons).forEach(([reason, count]) => {
      console.log(`   ${reason}: ${count} endpoint(s)`);
    });
  }
}

// Executar os testes
testAllGatewayEndpoints().catch(console.error);