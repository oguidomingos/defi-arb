const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');

// Endpoints alternativos para testar
const CANDIDATE_ENDPOINTS = {
  // SushiSwap alternatives
  sushiswap: [
    'https://api.thegraph.com/subgraphs/name/sushiswap/polygon-exchange',
    'https://api.thegraph.com/subgraphs/name/sushiswap/matic-v2',
    'https://api.studio.thegraph.com/query/32073/sushiswap-v2-polygon/v0.0.1',
    'https://gateway-arbitrum.network.thegraph.com/api/47bb427e0b85c4142f4013e3a20c5f5d/subgraphs/id/0x4bb4c1b0745ef7b4642feeccd0740dec417ca0a0-0',
  ],
  
  // QuickSwap alternatives
  quickswap: [
    'https://api.thegraph.com/subgraphs/name/quickswap/quickswap-v3',
    'https://api.thegraph.com/subgraphs/name/danielkurniadi/quickswap-polygon',
    'https://api.studio.thegraph.com/query/44554/quickswap-v3/version/latest',
  ],
  
  // Uniswap V3 Polygon alternatives
  uniswap: [
    'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon',
    'https://api.studio.thegraph.com/query/6499/uniswap-v3-polygon/version/latest',
  ],
  
  // Polygon general DEX aggregators
  polygon_dex: [
    'https://api.thegraph.com/subgraphs/name/1hive/polygon-dex',
    'https://api.thegraph.com/subgraphs/name/elkfinance/polygon',
  ]
};

// Tokens para testar (principais)
const TEST_TOKENS = [
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
];

// Query de teste de conectividade
const META_QUERY = gql`
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

// Query de pools padrão
const POOLS_QUERY = gql`
  query TestPools($tokens: [String!]) {
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

// Query alternativa para pairs (SushiSwap V2 style)
const PAIRS_QUERY = gql`
  query TestPairs($tokens: [String!]) {
    pairs(
      where: {
        token0_in: $tokens,
        token1_in: $tokens
      },
      first: 3,
      orderBy: reserveUSD,
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
      reserveUSD
      volumeUSD
      token0Price
      token1Price
    }
  }
`;

// Query para Uniswap V3 com sqrtPrice
const UNISWAP_V3_QUERY = gql`
  query TestUniswapV3Pools($tokens: [String!]) {
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
      sqrtPrice
      tick
      feeTier
      token0Price
      token1Price
    }
  }
`;

async function testEndpoint(url, dexName) {
  console.log(`\n🧪 Testando: ${dexName} - ${url}`);
  
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

    // Teste 1: Conectividade básica
    console.log('  📡 Testando conectividade...');
    try {
      const metaResult = await client.query({
        query: META_QUERY,
        fetchPolicy: 'no-cache'
      });
      
      if (metaResult.data && metaResult.data._meta) {
        console.log('  ✅ Conectividade OK');
        console.log(`     Bloco: ${metaResult.data._meta.block?.number || 'N/A'}`);
        console.log(`     Erros: ${metaResult.data._meta.hasIndexingErrors || false}`);
      } else {
        console.log('  ⚠️ Conectou mas sem metadados');
      }
    } catch (metaError) {
      if (metaError.message.includes('removed')) {
        console.log('  ❌ Endpoint removido');
        return { working: false, reason: 'endpoint_removed' };
      }
      console.log('  ⚠️ Metadados não disponíveis, tentando queries diretas...');
    }

    // Teste 2: Query de pools
    console.log('  🏊 Testando query de pools...');
    const queries = [
      { query: POOLS_QUERY, name: 'pools' },
      { query: PAIRS_QUERY, name: 'pairs' },
      { query: UNISWAP_V3_QUERY, name: 'uniswap_v3_pools' }
    ];

    for (const { query, name } of queries) {
      try {
        const result = await client.query({
          query,
          variables: { tokens: TEST_TOKENS },
          fetchPolicy: 'no-cache'
        });

        const dataKey = Object.keys(result.data || {})[0];
        const pools = result.data?.[dataKey] || [];

        if (pools.length > 0) {
          console.log(`  ✅ Query ${name} funcionou! ${pools.length} pools encontrados`);
          
          // Validar qualidade dos dados
          const firstPool = pools[0];
          const isRealData = firstPool.id && 
                           firstPool.id.length > 10 && 
                           firstPool.id.startsWith('0x') &&
                           firstPool.token0?.symbol &&
                           firstPool.token1?.symbol;

          if (isRealData) {
            console.log('  🎯 DADOS REAIS DETECTADOS!');
            console.log(`     Pool exemplo: ${firstPool.token0.symbol}/${firstPool.token1.symbol}`);
            console.log(`     ID: ${firstPool.id}`);
            console.log(`     TVL: $${parseFloat(firstPool.totalValueLockedUSD || firstPool.reserveUSD || 0).toLocaleString()}`);
            
            return {
              working: true,
              url,
              dexName,
              queryType: name,
              dataKey,
              samplePool: firstPool,
              totalPools: pools.length
            };
          } else {
            console.log('  ⚠️ Dados parecem suspeitos/incompletos');
          }
        } else {
          console.log(`  ⚠️ Query ${name} retornou vazia`);
        }
      } catch (queryError) {
        if (queryError.message.includes('removed')) {
          console.log(`  ❌ Query ${name}: Endpoint removido`);
          return { working: false, reason: 'endpoint_removed' };
        }
        console.log(`  ❌ Query ${name} falhou: ${queryError.message}`);
      }
    }

    return { working: false, reason: 'no_valid_queries' };

  } catch (error) {
    console.log(`  ❌ Erro geral: ${error.message}`);
    return { working: false, reason: 'connection_error', error: error.message };
  }
}

async function findWorkingEndpoints() {
  console.log('🔍 BUSCANDO ENDPOINTS FUNCIONAIS DO THE GRAPH\n');
  console.log('Tokens de teste:', TEST_TOKENS.map(addr => addr.slice(0, 8) + '...').join(', '));
  console.log('');

  const workingEndpoints = [];
  const failedEndpoints = [];

  for (const [category, urls] of Object.entries(CANDIDATE_ENDPOINTS)) {
    console.log(`\n📂 CATEGORIA: ${category.toUpperCase()}`);
    console.log('='.repeat(50));

    for (const url of urls) {
      const result = await testEndpoint(url, category);
      
      if (result.working) {
        workingEndpoints.push(result);
        console.log(`  🎉 ENDPOINT FUNCIONANDO ENCONTRADO!`);
      } else {
        failedEndpoints.push({ url, category, ...result });
      }
      
      // Delay entre testes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Resultados finais
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESULTADOS FINAIS');
  console.log('='.repeat(70));

  if (workingEndpoints.length > 0) {
    console.log(`\n✅ ${workingEndpoints.length} ENDPOINT(S) FUNCIONANDO ENCONTRADO(S):\n`);
    
    workingEndpoints.forEach((endpoint, idx) => {
      console.log(`${idx + 1}. ${endpoint.dexName.toUpperCase()}`);
      console.log(`   URL: ${endpoint.url}`);
      console.log(`   Query Type: ${endpoint.queryType}`);
      console.log(`   Data Key: ${endpoint.dataKey}`);
      console.log(`   Pools encontrados: ${endpoint.totalPools}`);
      console.log(`   Pool exemplo: ${endpoint.samplePool.token0.symbol}/${endpoint.samplePool.token1.symbol}`);
      console.log('');
    });

    // Gerar configuração para config.js
    console.log('🔧 CONFIGURAÇÃO SUGERIDA PARA config.js:');
    console.log('```javascript');
    console.log('dexSubgraphs: {');
    workingEndpoints.forEach(endpoint => {
      console.log(`  ${endpoint.dexName}: {`);
      console.log(`    url: '${endpoint.url}',`);
      console.log(`    name: '${endpoint.dexName.charAt(0).toUpperCase() + endpoint.dexName.slice(1)}',`);
      console.log(`    queryType: '${endpoint.queryType}',`);
      console.log(`    dataKey: '${endpoint.dataKey}'`);
      console.log(`  },`);
    });
    console.log('}');
    console.log('```');

  } else {
    console.log('\n❌ NENHUM ENDPOINT FUNCIONANDO ENCONTRADO');
    
    console.log('\n📋 Resumo das falhas:');
    const failureReasons = failedEndpoints.reduce((acc, failure) => {
      acc[failure.reason] = (acc[failure.reason] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(failureReasons).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count} endpoints`);
    });

    console.log('\n💡 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('1. Verificar The Graph Studio para endpoints pagos mais estáveis');
    console.log('2. Considerar APIs diretas das DEXs (SushiSwap API, QuickSwap API)');
    console.log('3. Implementar múltiplas fontes de dados com fallback');
  }
}

// Executar a busca
findWorkingEndpoints().catch(console.error);