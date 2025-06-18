const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
require('dotenv').config();

// Tokens reais encontrados nos subgraphs
const realTokens = [
  '0x0000000000000000000000000000000000001010', // MATIC
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619', // WETH
  '0x0000000000004946c0e9f43f4dee607b0ef1fa1c', // CHI
  '0x00000000efe302beaa2b3e6e1b18d08d69a9012a', // AUSD
  '0x004e869c8591b8585fcd3e63f3811803e4ca59a0', // BALL
  '0x0053705c0c54c4163f00a2ac288491078e9cc060', // BERRY
  '0x0059ca765cc75a9b977293681a1b8add0424f5f8', // DPLAT
  '0x00658b2c97c550767fe894d8cb21008d2ca4740f'  // 2MOON
];

const dexSubgraphs = {
  uniswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm`,
    name: 'Uniswap V3'
  },
  quickswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
    name: 'QuickSwap'
  }
};

async function testWithRealTokens(dexName, dexConfig) {
  console.log(`\n🔍 Testando ${dexConfig.name} com tokens reais...`);
  
  const client = new ApolloClient({
    uri: dexConfig.url,
    cache: new InMemoryCache(),
    fetch,
    headers: {
      'Authorization': `Bearer ${process.env.THE_GRAPH_API_KEY}`
    }
  });

  try {
    // Query para buscar pools com os tokens reais
    const query = gql`
      query Pools($tokens: [String!]) {
        pools(
          where: { 
            token0_in: $tokens, 
            token1_in: $tokens
          }, 
          first: 20,
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
          ${dexName === 'uniswap' ? 'sqrtPrice tick feeTier' : ''}
        }
      }
    `;
    
    const result = await client.query({
      query,
      variables: { tokens: realTokens },
      fetchPolicy: 'no-cache'
    });
    
    console.log(`✅ ${result.data.pools.length} pools encontrados na ${dexConfig.name}`);
    
    if (result.data.pools.length > 0) {
      console.log('\n📊 Pools encontrados:');
      result.data.pools.forEach((pool, index) => {
        const tvl = parseFloat(pool.totalValueLockedUSD || '0');
        const volume = parseFloat(pool.volumeUSD || '0');
        console.log(`${index + 1}. ${pool.token0.symbol}/${pool.token1.symbol}`);
        console.log(`   ID: ${pool.id}`);
        console.log(`   TVL: $${tvl.toLocaleString()}`);
        console.log(`   Volume: $${volume.toLocaleString()}`);
        console.log(`   Preço: ${pool.token0Price} ${pool.token0.symbol}/${pool.token1.symbol}`);
        if (dexName === 'uniswap') {
          console.log(`   Fee Tier: ${pool.feeTier}`);
        }
        console.log('');
      });
    } else {
      console.log('❌ Nenhum pool encontrado com os tokens fornecidos');
    }
    
  } catch (error) {
    console.error(`❌ Erro ao consultar ${dexConfig.name}:`, error.message);
    if (error.graphQLErrors) {
      error.graphQLErrors.forEach(err => {
        console.error('  GraphQL Error:', err.message);
      });
    }
  }
}

async function main() {
  console.log('🧪 Testando com tokens reais dos subgraphs');
  console.log('==========================================');
  console.log(`🔍 Tokens testados: ${realTokens.length}`);
  realTokens.forEach((token, index) => {
    console.log(`   ${index + 1}. ${token}`);
  });
  
  for (const [dexName, dexConfig] of Object.entries(dexSubgraphs)) {
    await testWithRealTokens(dexName, dexConfig);
  }
  
  console.log('\n✅ Teste concluído');
}

main().catch(console.error); 