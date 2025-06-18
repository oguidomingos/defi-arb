require('dotenv').config();

const { ethers } = require('ethers');

const config = {
  // Configurações da rede Polygon
  infuraProjectId: process.env.INFURA_PROJECT_ID,
  alchemyPolygonRpcUrl: process.env.ALCHEMY_POLYGON_RPC_URL,
  polygonRpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  
  // Chave privada para execução de transações
  privateKey: process.env.PRIVATE_KEY,
  
  // API Keys
  theGraphApiKey: process.env.THE_GRAPH_API_KEY,
  
  // Configurações do sistema
  minProfitabilityThreshold: parseFloat(process.env.MIN_PROFITABILITY_THRESHOLD) || 0.5,
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE) || 0.5,
  updateInterval: parseInt(process.env.UPDATE_INTERVAL) || 15000,
  checkInterval: parseInt(process.env.CHECK_INTERVAL) || 5000,
  
  // Endereços dos contratos
  flashLoanContractAddress: process.env.FLASH_LOAN_CONTRACT_ADDRESS,
  
  // Tokens principais para arbitragem triangular (foco em qualidade)
  tokens: {
    USDC: {
      address: process.env.USDC_ADDRESS || '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      symbol: 'USDC',
      decimals: 6,
      isCore: true
    },
    WETH: {
      address: process.env.WETH_ADDRESS || '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
      symbol: 'WETH',
      decimals: 18,
      isCore: true
    },
    WMATIC: {
      address: process.env.WMATIC_ADDRESS || '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
      symbol: 'WMATIC',
      decimals: 18,
      isCore: true
    }
  },
  
  // Filtros de qualidade aprimorados
  qualityFilters: {
    minLiquidityUSD: 50000,        // $50k mínimo (aumentado de $1k)
    minVolume24hUSD: 10000,        // $10k volume diário
    maxSpreadPercent: 5,           // 5% máximo (reduzido de 10%)
    minSpreadPercent: 0.01,        // 0.01% mínimo
    maxPriceAgeMinutes: 10         // Dados de até 10 minutos
  },
  
  // Subgraphs das DEXs (URLs atualizadas com os endpoints corretos)
  dexSubgraphs: {
    uniswap: {
      url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm`,
      name: 'Uniswap V3'
    },
    quickswap: {
      url: `https://gateway.thegraph.com/api/${process.env.THE_GRAPH_API_KEY}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
      name: 'QuickSwap'
    }
  },
  
  // Configurações de gás
  gas: {
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'), // 50 gwei
    maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei') // 30 gwei
  }
};

module.exports = config; 