const { ethers } = require('ethers');
const config = require('../config');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.flashLoanContract = null;
    this.initializeProvider();
  }

  initializeProvider() {
    try {
      // Usar Alchemy se disponível, senão usar Infura ou RPC público
      const rpcUrl = config.alchemyPolygonRpcUrl || 
                    `https://polygon-mainnet.infura.io/v3/${config.infuraProjectId}` ||
                    config.polygonRpcUrl;
      
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      
      if (config.privateKey) {
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        console.log('✓ Wallet conectada:', this.wallet.address);
      } else {
        console.log('⚠️  Chave privada não configurada - modo somente leitura');
      }
      
    } catch (error) {
      console.error('Erro ao inicializar provider:', error);
      throw error;
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

  // ABI básico para flash loans (baseado no poly-flash)
  getFlashLoanABI() {
    return [
      'function flashLoanSimple(address receiver, address asset, uint256 amount, bytes calldata data, uint16 referralCode) external',
      'function flashLoan(address receiver, address[] calldata assets, uint256[] calldata amounts, uint256[] calldata interestRateModes, address onBehalfOf, bytes calldata data, uint16 referralCode) external',
      'event FlashLoan(address indexed receiver, address indexed asset, uint256 amount, uint256 premium)'
    ];
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

  // Executar arbitragem com flash loan
  async executeArbitrage(opportunity) {
    if (!this.wallet) {
      throw new Error('Wallet não configurada para execução');
    }

    try {
      // Determinar token e quantidade para flash loan
      const { asset, amount } = this.determineFlashLoanParams(opportunity);
      
      // Simular transação primeiro
      const simulation = await this.simulateTransaction(asset, amount);
      console.log('📊 Simulação da transação:', simulation);
      
      // Verificar se ainda é lucrativa após custos
      const netProfit = opportunity.netProfit - parseFloat(simulation.gasCost);
      if (netProfit <= 0) {
        console.log('⚠️  Oportunidade não é mais lucrativa após custos de gás');
        return { success: false, reason: 'Not profitable after gas costs' };
      }
      
      // Preparar dados para a arbitragem
      const arbitrageData = this.encodeArbitrageData(opportunity);
      
      // Executar flash loan
      const result = await this.executeFlashLoan(asset, amount, arbitrageData);
      
      return {
        ...result,
        opportunity,
        simulation,
        netProfit
      };
      
    } catch (error) {
      console.error('Erro ao executar arbitragem:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Determinar parâmetros do flash loan baseado na oportunidade
  determineFlashLoanParams(opportunity) {
    // Por padrão, usar WMATIC como asset para flash loan
    const asset = config.tokens.WMATIC.address;
    const amount = ethers.utils.parseEther('100'); // 100 WMATIC
    
    // TODO: Implementar lógica mais sofisticada baseada na oportunidade
    // - Calcular quantidade ótima baseada no spread
    // - Escolher token baseado na liquidez disponível
    
    return { asset, amount };
  }

  // Codificar dados da arbitragem para o flash loan
  encodeArbitrageData(opportunity) {
    // TODO: Implementar codificação específica para cada tipo de arbitragem
    // Por enquanto, retornar dados vazios
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