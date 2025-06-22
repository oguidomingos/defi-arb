const { ethers } = require('ethers');
const config = require('../config');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.flashLoanContract = null;
    this.initializeProvider().catch(error => {
      console.error('Erro na inicialização assíncrona:', error);
    });
  }

  async initializeProvider() {
    try {
      // Lista de RPC endpoints para failover
      const rpcEndpoints = [
        config.alchemyPolygonRpcUrl,
        config.infuraProjectId ? `https://polygon-mainnet.infura.io/v3/${config.infuraProjectId}` : null,
        'https://polygon-rpc.com',
        'https://rpc-mainnet.matic.network',
        'https://rpc-mainnet.maticvigil.com',
        'https://rpc.ankr.com/polygon'
      ].filter(Boolean);
      
      console.log('🔌 Tentando conectar aos RPC endpoints da Polygon...');
      
      // Tentar cada endpoint até encontrar um que funcione
      for (const rpcUrl of rpcEndpoints) {
        try {
          console.log(`🔄 Testando: ${rpcUrl.substring(0, 50)}...`);
          
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl, {
            name: 'polygon',
            chainId: 137
          });
          
          // Testar conexão com timeout
          const networkTest = await Promise.race([
            provider.getNetwork(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);
          
          if (networkTest.chainId === 137) {
            this.provider = provider;
            console.log('✅ Conectado com sucesso ao RPC:', rpcUrl.substring(0, 50) + '...');
            break;
          }
        } catch (error) {
          console.log(`❌ Falhou: ${error.message}`);
          continue;
        }
      }
      
      if (!this.provider) {
        throw new Error('Nenhum RPC endpoint da Polygon funcionando');
      }
      
      if (config.privateKey) {
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        console.log('✓ Wallet conectada:', this.wallet.address);
      } else {
        console.log('⚠️  Chave privada não configurada - modo somente leitura');
      }
      
    } catch (error) {
      console.error('❌ Erro ao inicializar provider:', error);
      // Usar provider padrão como fallback
      this.provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com', {
        name: 'polygon',
        chainId: 137
      });
      console.log('🔄 Usando provider padrão como fallback');
    }
  }

  // Obter preço do gás atual
  async getGasPrice() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return gasPrice;
    } catch (error) {
      console.error('Erro ao obter preço do gás:', error);
      // Retornar preço padrão se falhar
      return ethers.utils.parseUnits('30', 'gwei');
    }
  }

  // Obter saldo de MATIC
  async getMaticBalance(address = null) {
    try {
      const targetAddress = address || this.wallet?.address;
      if (!targetAddress) throw new Error('Endereço não especificado');
      
      const balance = await this.provider.getBalance(targetAddress);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Erro ao obter saldo MATIC:', error);
      return '0';
    }
  }

  // Obter saldo de token ERC-20
  async getTokenBalance(tokenAddress, address = null) {
    try {
      const targetAddress = address || this.wallet?.address;
      if (!targetAddress) throw new Error('Endereço não especificado');
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      
      const balance = await tokenContract.balanceOf(targetAddress);
      return balance;
    } catch (error) {
      console.error('Erro ao obter saldo do token:', error);
      return ethers.BigNumber.from(0);
    }
  }

  // Enum para DexType (deve corresponder ao contrato Solidity)
  static DexType = {
    UNISWAP_V2: 0,
    UNISWAP_V3: 1,
    SUSHISWAP: 2,
    QUICKSWAP: 3,
  };

  // ABI do contrato FlashLoanArbitrage.sol
  getFlashLoanABI() {
    return [
      {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "tokenA",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "tokenB",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "profit",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "string",
            "name": "route",
            "type": "string"
          }
        ],
        "name": "ArbitrageExecuted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "premium",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "initiator",
            "type": "address"
          }
        ],
        "name": "FlashLoanExecuted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "previousOwner",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "ProfitWithdrawn",
        "type": "event"
      },
      {
        "stateMutability": "payable",
        "type": "fallback"
      },
      {
        "inputs": [],
        "name": "AAVE_POOL",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "QUICKSWAP_ROUTER",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "SUSHISWAP_ROUTER",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "UNISWAP_V2_ROUTER",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "UNISWAP_V3_ROUTER",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "USDC",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "WETH",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "WMATIC",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address[]",
            "name": "assets",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "amounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "premiums",
            "type": "uint256[]"
          },
          {
            "internalType": "address",
            "name": "initiator",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "params",
            "type": "bytes"
          }
        ],
        "name": "executeOperation",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address[]",
            "name": "assets",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "amounts",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "interestRateModes",
            "type": "uint256[]"
          },
          {
            "internalType": "address",
            "name": "onBehalfOf",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          },
          {
            "internalType": "uint16",
            "name": "referralCode",
            "type": "uint16"
          }
        ],
        "name": "flashLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          },
          {
            "internalType": "uint16",
            "name": "referralCode",
            "type": "uint16"
          }
        ],
        "name": "flashLoanSimple",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_flashLoanToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_flashLoanAmount",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "tokenIn",
                "type": "address"
              },
              {
                "internalType": "address",
                "name": "tokenOut",
                "type": "address"
              },
              {
                "internalType": "enum FlashLoanArbitrage.DexType",
                "name": "dexType",
                "type": "uint8"
              },
              {
                "internalType": "uint24",
                "name": "fee",
                "type": "uint24"
              }
            ],
            "internalType": "struct FlashLoanArbitrage.ArbitrageStep[]",
            "name": "_steps",
            "type": "tuple[]"
          }
        ],
        "name": "initiateArbitrageFromBackend",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "name": "profits",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "renounceOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address payable",
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "withdrawETH",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "withdrawProfit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          }
        ],
        "name": "withdrawToken",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "stateMutability": "payable",
        "type": "receive"
      }
    ]
  }

  // Inicializar contrato de flash loan
  initializeFlashLoanContract() {
    if (!config.flashLoanContractAddress) {
      console.log('⚠️  Endereço do contrato de flash loan não configurado');
      return false;
    }

    try {
      this.flashLoanContract = new ethers.Contract(
        config.flashLoanContractAddress,
        this.getFlashLoanABI(),
        this.wallet || this.provider
      );
      
      console.log('✓ Contrato de flash loan inicializado');
      return true;
    } catch (error) {
      console.error('Erro ao inicializar contrato de flash loan:', error);
      return false;
    }
  }

  // Executar flash loan simples
  async executeFlashLoan(asset, amount, data = '0x') {
    if (!this.flashLoanContract || !this.wallet) {
      throw new Error('Contrato de flash loan ou wallet não inicializado');
    }

    try {
      console.log(`🚀 Executando flash loan: ${ethers.utils.formatEther(amount)} ${asset}`);
      
      const tx = await this.flashLoanContract.flashLoanSimple(
        this.wallet.address, // receiver
        asset, // asset address
        amount, // amount
        data, // data
        0 // referral code
      );
      
      console.log('⏳ Aguardando confirmação da transação...');
      const receipt = await tx.wait();
      
      console.log('✓ Flash loan executado com sucesso!');
      console.log('📋 Hash da transação:', receipt.transactionHash);
      console.log('💰 Gás usado:', receipt.gasUsed.toString());
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        receipt
      };
      
    } catch (error) {
      console.error('❌ Erro ao executar flash loan:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Simular transação antes de executar
  async simulateTransaction(asset, amount, data = '0x') {
    if (!this.flashLoanContract || !this.wallet) {
      throw new Error('Contrato de flash loan ou wallet não inicializado');
    }

    try {
      const populatedTx = await this.flashLoanContract.populateTransaction.flashLoanSimple(
        this.wallet.address,
        asset,
        amount,
        data,
        0
      );

      const gasEstimate = await this.provider.estimateGas(populatedTx);
      const gasPrice = await this.getGasPrice();
      const gasCost = gasEstimate.mul(gasPrice);
      
      return {
        gasEstimate: gasEstimate.toString(),
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
        gasCost: ethers.utils.formatEther(gasCost),
        totalCost: gasCost
      };
      
    } catch (error) {
      console.error('Erro ao simular transação:', error);
      throw error;
    }
  }

  /**
   * @dev Inicia uma operação de arbitragem a partir do backend.
   * @param flashLoanToken O token inicial do flash loan e da arbitragem.
   * @param flashLoanAmount A quantidade do token a ser emprestada e usada na arbitragem.
   * @param arbitrageSteps Os passos da rota de arbitragem.
   */
  async initiateArbitrageFromBackend(flashLoanToken, flashLoanAmount, arbitrageSteps) {
    if (!this.flashLoanContract || !this.wallet) {
      throw new Error('Contrato de flash loan ou wallet não inicializado');
    }

    try {
      console.log(`🚀 Iniciando arbitragem do backend: Token=${flashLoanToken}, Quantidade=${ethers.utils.formatEther(flashLoanAmount)}`);
      
      const tx = await this.flashLoanContract.initiateArbitrageFromBackend(
        flashLoanToken,
        flashLoanAmount,
        arbitrageSteps
      );
      
      console.log('⏳ Aguardando confirmação da transação...');
      const receipt = await tx.wait();
      
      console.log('✓ Arbitragem iniciada com sucesso!');
      console.log('📋 Hash da transação:', receipt.transactionHash);
      console.log('💰 Gás usado:', receipt.gasUsed.toString());
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        receipt
      };
      
    } catch (error) {
      console.error('❌ Erro ao iniciar arbitragem do backend:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * @dev Inicia uma operação de arbitragem dinâmica.
   *      Caso o contrato não possua a função dedicada, faz fallback
   *      para initiateArbitrageFromBackend utilizando Uniswap V3.
   * @param flashLoanToken Token do flash loan
   * @param flashLoanAmount Quantidade do flash loan
   * @param minReturn Retorno mínimo esperado
   * @param tokenPath Caminho de tokens para a arbitragem
   */
  async initiateDynamicArbitrage(flashLoanToken, flashLoanAmount, minReturn, tokenPath) {
    if (!this.flashLoanContract || !this.wallet) {
      throw new Error('Contrato de flash loan ou wallet não inicializado');
    }

    try {
      console.log(
        `🚀 Iniciando arbitragem dinâmica: Token=${flashLoanToken}, Quantidade=${ethers.utils.formatEther(flashLoanAmount)}`
      );

      let tx;
      if (this.flashLoanContract.initiateDynamicArbitrage) {
        tx = await this.flashLoanContract.initiateDynamicArbitrage(
          flashLoanToken,
          flashLoanAmount,
          minReturn,
          tokenPath
        );
      } else {
        // Fallback simples usando Uniswap V3 para todas as etapas
        const steps = [];
        for (let i = 0; i < tokenPath.length - 1; i++) {
          steps.push({
            tokenIn: tokenPath[i],
            tokenOut: tokenPath[i + 1],
            dexType: BlockchainService.DexType.UNISWAP_V3,
            fee: 3000
          });
        }
        tx = await this.flashLoanContract.initiateArbitrageFromBackend(
          flashLoanToken,
          flashLoanAmount,
          steps
        );
      }

      console.log('⏳ Aguardando confirmação da transação...');
      const receipt = await tx.wait();

      console.log('✓ Arbitragem dinâmica iniciada com sucesso!');
      console.log('📋 Hash da transação:', receipt.transactionHash);
      console.log('💰 Gás usado:', receipt.gasUsed.toString());

      return {
        success: true,
        txHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        receipt
      };
    } catch (error) {
      console.error('❌ Erro ao iniciar arbitragem dinâmica:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Codificar dados da arbitragem para o flash loan
  encodeArbitrageData(flashLoanToken, flashLoanAmount, arbitrageSteps) {
    // A função initiateArbitrageFromBackend agora recebe os dados diretamente,
    // então não precisamos mais codificar ArbitrageData aqui.
    // Este método pode ser removido ou adaptado se houver outras necessidades de codificação.
    console.warn('encodeArbitrageData foi chamado, mas initiateArbitrageFromBackend agora recebe dados diretamente.');
    return '0x';
  }

  // Obter informações da rede
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const gasPrice = await this.getGasPrice();
      
      return {
        chainId: network.chainId,
        name: network.name,
        blockNumber: blockNumber.toString(),
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      console.error('Erro ao obter informações da rede:', error);
      return null;
    }
  }

  // Verificar se a wallet tem saldo suficiente
  async checkWalletBalance() {
    if (!this.wallet) return null;
    
    try {
      const maticBalance = await this.getMaticBalance();
      const wmaticBalance = await this.getTokenBalance(config.tokens.WMATIC.address);
      const usdcBalance = await this.getTokenBalance(config.tokens.USDC.address);
      
      return {
        matic: maticBalance,
        wmatic: ethers.utils.formatEther(wmaticBalance),
        usdc: ethers.utils.formatUnits(usdcBalance, 6)
      };
    } catch (error) {
      console.error('Erro ao verificar saldos:', error);
      return null;
    }
  }
}

module.exports = BlockchainService; 