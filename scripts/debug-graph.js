const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
require('dotenv').config();

// Configuração dos subgraphs
const dexSubgraphs = {
  uniswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm`,
    name: 'Uniswap V3'
  },
  sushiswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/ELUcwgpm14LKPLrBRuVvPvNKHQ9HvwmtKgKSH6123cr7`,
    name: 'SushiSwap'
  },
  quickswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
    name: 'QuickSwap'
  }
};

// Tokens para teste
const testTokens = [
  '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
  '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'  // WETH
];

async function testSubgraph(dexName, dexConfig) {
  console.log(`\n🔍 Testando ${dexName} (${dexConfig.name})...`);
  console.log(`URL: ${dexConfig.url}`);
  
  const client = new ApolloClient({
    uri: dexConfig.url,
    cache: new InMemoryCache(),
    fetch,
    headers: process.env.THE_GRAPH_API_KEY ? {
      'Authorization': `Bearer ${process.env.THE_GRAPH_API_KEY}`
    } : {}
  });

  try {
    // Teste 1: Query simples para verificar se o subgraph responde
    console.log('\n1️⃣ Testando query simples...');
    const simpleQuery = gql`
      query {
        _meta {
          block {
            number
          }
        }
      }
    `;
    
    const simpleResult = await client.query({
      query: simpleQuery,
      fetchPolicy: 'no-cache'
    });
    console.log('✅ Subgraph responde:', simpleResult.data);

    // Teste 2: Verificar campos disponíveis
    console.log('\n2️⃣ Verificando campos disponíveis...');
    const fieldsToTest = ['pools', 'pairs', 'liquidityPools', 'swapPairs'];
    
    for (const field of fieldsToTest) {
      try {
        const testQuery = gql`
          query {
            ${field}(first: 1) {
              id
            }
          }
        `;
        
        const result = await client.query({
          query: testQuery,
          fetchPolicy: 'no-cache'
        });
        
        if (result.data && result.data[field]) {
          console.log(`✅ Campo '${field}' disponível`);
          
          // Teste 3: Verificar estrutura do campo
          console.log(`3️⃣ Verificando estrutura de '${field}'...`);
          const structureQuery = gql`
            query {
              ${field}(first: 1) {
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
                sqrtPrice
                tick
                feeTier
              }
            }
          `;
          
          const structureResult = await client.query({
            query: structureQuery,
            fetchPolicy: 'no-cache'
          });
          
          console.log(`✅ Estrutura de '${field}':`, JSON.stringify(structureResult.data[field][0], null, 2));
          break;
        }
      } catch (error) {
        console.log(`❌ Campo '${field}' não disponível: ${error.message}`);
      }
    }

    // Teste 4: Query com filtros de tokens
    console.log('\n4️⃣ Testando query com filtros...');
    const filterQuery = gql`
      query Pools($tokens: [String!]) {
        pools(
          where: { 
            token0_in: $tokens, 
            token1_in: $tokens
          }, 
          first: 10
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
        }
      }
    `;
    
    const filterResult = await client.query({
      query: filterQuery,
      variables: { tokens: testTokens },
      fetchPolicy: 'no-cache'
    });
    
    console.log(`✅ Pools encontrados: ${filterResult.data.pools.length}`);
    if (filterResult.data.pools.length > 0) {
      console.log('Exemplo de pool:', JSON.stringify(filterResult.data.pools[0], null, 2));
    }

  } catch (error) {
    console.error(`❌ Erro ao testar ${dexName}:`, error.message);
    if (error.graphQLErrors) {
      error.graphQLErrors.forEach(err => {
        console.error('  GraphQL Error:', err.message);
        console.error('  Locations:', err.locations);
        console.error('  Path:', err.path);
      });
    }
  }
}

async function main() {
  console.log('🔍 Debug das queries GraphQL');
  console.log('============================');
  
  if (!process.env.THE_GRAPH_API_KEY) {
    console.error('❌ THE_GRAPH_API_KEY não configurada no .env');
    return;
  }
  
  console.log(`✅ API Key configurada: ${process.env.THE_GRAPH_API_KEY.substring(0, 10)}...`);
  console.log(`🔍 Tokens de teste: ${testTokens.join(', ')}`);
  
  for (const [dexName, dexConfig] of Object.entries(dexSubgraphs)) {
    await testSubgraph(dexName, dexConfig);
  }
  
  console.log('\n✅ Debug concluído');
}

main().catch(console.error); 