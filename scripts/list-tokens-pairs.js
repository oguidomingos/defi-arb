const { ApolloClient, InMemoryCache, gql } = require('@apollo/client/core');
const fetch = require('node-fetch');
require('dotenv').config();

const dexSubgraphs = {
  uniswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm`,
    name: 'Uniswap V3',
    tokensField: 'tokens',
    pairsField: 'pools',
  },
  sushiswap: {
    // endpoint alternativo direto
    url: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
    name: 'SushiSwap',
    tokensField: 'tokens',
    pairsField: 'pairs',
  },
  quickswap: {
    url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
    name: 'QuickSwap',
    tokensField: 'tokens',
    pairsField: 'pools',
  }
};

async function listTokensAndPairs(dexName, dexConfig) {
  console.log(`\n🔍 Listando tokens e pares de ${dexConfig.name}...`);
  const client = new ApolloClient({
    uri: dexConfig.url,
    cache: new InMemoryCache(),
    fetch,
    headers: dexConfig.url.includes('gateway.thegraph.com') && process.env.THE_GRAPH_API_KEY ? {
      'Authorization': `Bearer ${process.env.THE_GRAPH_API_KEY}`
    } : {}
  });

  // Listar tokens
  try {
    const tokensQuery = gql`
      query {
        ${dexConfig.tokensField}(first: 10) {
          id
          symbol
          name
          decimals
        }
      }
    `;
    const tokensResult = await client.query({ query: tokensQuery, fetchPolicy: 'no-cache' });
    console.log('🪙 Tokens encontrados:');
    tokensResult.data[dexConfig.tokensField].forEach(t => {
      console.log(`  - ${t.symbol} (${t.name}): ${t.id}`);
    });
  } catch (err) {
    console.error('❌ Erro ao listar tokens:', err.message);
  }

  // Listar pares/pools
  try {
    const pairsQuery = gql`
      query {
        ${dexConfig.pairsField}(first: 10) {
          id
          token0 { id symbol } 
          token1 { id symbol }
        }
      }
    `;
    const pairsResult = await client.query({ query: pairsQuery, fetchPolicy: 'no-cache' });
    console.log('🔗 Pares/Pools encontrados:');
    pairsResult.data[dexConfig.pairsField].forEach(p => {
      console.log(`  - ${p.token0.symbol}/${p.token1.symbol}: ${p.id}`);
    });
  } catch (err) {
    console.error('❌ Erro ao listar pares/pools:', err.message);
  }
}

async function main() {
  for (const [dexName, dexConfig] of Object.entries(dexSubgraphs)) {
    await listTokensAndPairs(dexName, dexConfig);
  }
}

main().catch(console.error); 