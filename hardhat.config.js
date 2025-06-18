require('dotenv').config();
require('@nomiclabs/hardhat-waffle');

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    polygon: {
      url: process.env.ALCHEMY_POLYGON_RPC_URL || 
           `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}` ||
           'https://polygon-rpc.com',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000, // 30 gwei
      timeout: 60000
    },
    polygonMumbai: {
      url: process.env.ALCHEMY_POLYGON_MUMBAI_RPC_URL || 
           `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 30000000000, // 30 gwei
      timeout: 60000
    },
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_POLYGON_RPC_URL || 
             `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        blockNumber: 50000000
      }
    }
  },
  mocha: {
    timeout: 40000
  }
}; 