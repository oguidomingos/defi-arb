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
  
  // Tokens estratégicos para arbitragem triangular (expandido com foco em qualidade)
  tokens: {
    // Tokens principais (mantidos)
    USDC: {
      address: process.env.USDC_ADDRESS || '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      symbol: 'USDC',
      decimals: 6,
      isCore: true,
      priority: 1
    },
    WETH: {
      address: process.env.WETH_ADDRESS || '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
      symbol: 'WETH',
      decimals: 18,
      isCore: true,
      priority: 1
    },
    WMATIC: {
      address: process.env.WMATIC_ADDRESS || '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
      symbol: 'WMATIC',
      decimals: 18,
      isCore: true,
      priority: 1
    },
    
    // Token nativo MATIC (fundamental para Polygon)
    MATIC: {
      address: '0x0000000000000000000000000000000000001010',
      symbol: 'MATIC',
      decimals: 18,
      isCore: true,
      priority: 1,
      isNative: true
    },
    
    // Stablecoins alternativos com alta liquidez
    USDT: {
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      symbol: 'USDT',
      decimals: 6,
      isCore: true,
      priority: 2
    },
    DAI: {
      address: '0x8f3cf7ad23cd3cafb9b98f4040ab1000e0d09b87',
      symbol: 'DAI',
      decimals: 18,
      isCore: true,
      priority: 2
    },
    
    // Tokens DeFi com volume significativo
    AAVE: {
      address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
      symbol: 'AAVE',
      decimals: 18,
      isCore: false,
      priority: 3
    },
    LINK: {
      address: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
      symbol: 'LINK',
      decimals: 18,
      isCore: false,
      priority: 3
    },
    
    // Token wrapped Bitcoin
    WBTC: {
      address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
      symbol: 'WBTC',
      decimals: 8,
      isCore: false,
      priority: 3
    },
    
    // Tokens de alta liquidez adicionais
    CRV: {
      address: '0x172370d5cd63279efa6d502dab29171933a610af',
      symbol: 'CRV',
      decimals: 18,
      isCore: false,
      priority: 4
    },
    UNI: {
      address: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
      symbol: 'UNI',
      decimals: 18,
      isCore: false,
      priority: 4
    }
  },
  
  // Filtros de qualidade dinâmicos baseados na prioridade dos tokens
  qualityFilters: {
    // Filtros base para todos os tokens (consistente com arbitrageConfig)
    base: {
      minLiquidityUSD: 30000,        // $30k mínimo (igual ao arbitrageConfig)
      minVolume24hUSD: 5000,         // $5k volume diário
      maxSpreadPercent: 5,           // 5% máximo
      minSpreadPercent: 0.01,        // 0.01% mínimo
      maxPriceAgeMinutes: 10         // Dados de até 10 minutos
    },
    
    // Mantém a referência global para compatibilidade
    minLiquidityUSD: 30000,          // Valor unificado usado por vários serviços
    
    // Filtros por prioridade de token
    byPriority: {
      1: { // Tokens core (USDC, WETH, WMATIC, MATIC)
        minLiquidityUSD: 20000,      // Menor exigência para tokens principais
        minVolume24hUSD: 3000,
        maxSpreadPercent: 8
      },
      2: { // Stablecoins alternativos (USDT, DAI)
        minLiquidityUSD: 40000,
        minVolume24hUSD: 8000,
        maxSpreadPercent: 6
      },
      3: { // Tokens DeFi estabelecidos (AAVE, LINK, WBTC)
        minLiquidityUSD: 60000,
        minVolume24hUSD: 12000,
        maxSpreadPercent: 4
      },
      4: { // Tokens secundários (CRV, UNI)
        minLiquidityUSD: 80000,
        minVolume24hUSD: 15000,
        maxSpreadPercent: 3
      }
    },
    
    // Filtros específicos para validação de tokens
    tokenValidation: {
      requiredDecimals: [6, 8, 9, 18],     // Decimais válidos
      blacklistPatterns: ['TEST', '^$'],    // Padrões para blacklist
      minSymbolLength: 2,                   // Símbolo mínimo
      maxSymbolLength: 10                   // Símbolo máximo
    }
  },
  
  // Subgraphs das DEXs (URLs corretas sem API key - autenticação via header)
  dexSubgraphs: {
    uniswap: {
      url: 'https://gateway.thegraph.com/api/subgraphs/id/3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm',
      name: 'Uniswap V3',
      type: 'uniswap_v3_style'
    },
    balancer: {
      url: 'https://gateway.thegraph.com/api/subgraphs/id/78nZMyM9yD77KG6pFaYap31kJvj8eUWLEntbiVzh8ZKN',
      name: 'Balancer V2',
      type: 'balancer_style'
    }
  },
  
  // Configurações de arbitragem triangular
  arbitrageConfig: {
    minProfitPercent: 0.1,           // 0.1% mínimo de lucro
    maxProfitPercent: 50,            // 50% máximo (validação de sanidade)
    minLiquidityUSD: 30000,          // $30k mínimo (consistente com qualityFilters)
    maxGasFeesPercent: 0.05,         // 0.05% máximo de gas fees
    timeoutMs: 30000,                // 30s timeout para execução
    enableDetailedLogging: true,     // Logs detalhados para debug
    allowSingleDexArbitrage: true    // Permitir arbitragem intra-DEX (uma única DEX)
  },

  // Configurações de gás
  gas: {
    maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'), // 50 gwei
    maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei') // 30 gwei
  }
};

module.exports = config; 