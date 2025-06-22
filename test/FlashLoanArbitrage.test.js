const { expect } = require("chai");
const { ethers } = require("hardhat");
// Endereço e ABI do Aave Pool V3 na Polygon
const AAVE_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
const AAVE_POOL_ABI = [
  "function getReserveData(address asset) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40))"
];

// Interfaces para DEXs
const IERC20 = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

describe("FlashLoanArbitrage", function () {
  let FlashLoanArbitrage;
  let flashLoanArbitrage;
  let owner;

  // Endereços reais da Polygon Mainnet para tokens e routers
  const WMATIC_ADDRESS = ethers.utils.getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"); // WMATIC
  const USDC_ADDRESS = ethers.utils.getAddress("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"); // USDC
  const WETH_ADDRESS = ethers.utils.getAddress("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"); // WETH

  // Endereços reais de routers na Polygon Mainnet
  const SUSHI_ROUTER_ADDRESS = ethers.utils.getAddress("0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"); // SushiSwap Router
  const QUICK_ROUTER_ADDRESS = ethers.utils.getAddress("0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"); // QuickSwap Router
  const UNISWAP_V3_ROUTER_ADDRESS = ethers.utils.getAddress("0xE592427A0AEce92De3Edee1F18E0157C05861564"); // Uniswap V3 SwapRouter

  before(async function () {
    // Configurar fork da Polygon Mainnet
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: "https://polygon-rpc.com",
          blockNumber: 40000000 // Bloco recente
        }
      }]
    });

    [owner] = await ethers.getSigners();
    FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    flashLoanArbitrage = await FlashLoanArbitrage.deploy();
    await flashLoanArbitrage.deployed();
    console.log("FlashLoanArbitrage deployado em:", flashLoanArbitrage.address);

    // Fundir o contrato com 1 MATIC para taxas
    await owner.sendTransaction({
      to: flashLoanArbitrage.address,
      value: ethers.utils.parseEther("1")
    });
  });

  it("deve simular um flashloan e arbitragem com WMATIC, USDC e WETH", async function () {
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    console.log("Saldo inicial do owner:", ethers.utils.formatEther(initialOwnerBalance));

    // Simular um flashloan de 1 WMATIC
    const amount = ethers.utils.parseUnits("1", 18); // 1 WMATIC

    // 1. Verificar saldo no Aave Pool (usando callStatic para evitar gastar gas)
    const aavePool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, owner);
    const reserveData = await aavePool.callStatic.getReserveData(WMATIC_ADDRESS);
    const availableLiquidity = reserveData[0];
    console.log("Saldo WMATIC no Aave Pool:", ethers.utils.formatUnits(availableLiquidity, 18));

    if (availableLiquidity.lt(amount)) {
      throw new Error(`Liquidez insuficiente no Aave Pool (${ethers.utils.formatUnits(availableLiquidity, 18)} WMATIC disponíveis)`);
    }

    // 2. Verificar aprovações e configurar
    const wmatic = new ethers.Contract(WMATIC_ADDRESS, IERC20, owner);
    
    // Verificar allowance atual
    const allowance = await wmatic.callStatic.allowance(flashLoanArbitrage.address, AAVE_POOL_ADDRESS);
    console.log("Allowance WMATIC para Aave Pool:", ethers.utils.formatUnits(allowance, 18));

    // 3. Verificar se o contrato tem saldo para taxas
    const contractBalance = await ethers.provider.getBalance(flashLoanArbitrage.address);
    console.log("Saldo do contrato para taxas:", ethers.utils.formatEther(contractBalance));

    // 4. Aprovar o Aave Pool se necessário
    if (allowance.lt(amount)) {
      const approveTx = await wmatic.approve(AAVE_POOL_ADDRESS, amount);
      await approveTx.wait();
      console.log("Aprovação de WMATIC para Aave Pool concluída");
    } else {
      console.log("Allowance já suficiente, pulando aprovação");
    }

    // Criar os passos da arbitragem usando a nova estrutura
    const steps = [
      {
        tokenIn: WMATIC_ADDRESS,
        tokenOut: USDC_ADDRESS,
        dexType: 1, // 1 = Uniswap V3 (DexType.UNISWAP_V3 no contrato)
        fee: 3000 // Fee tier 0.3%
      },
      {
        tokenIn: USDC_ADDRESS,
        tokenOut: WETH_ADDRESS,
        dexType: 2, // 2 = SushiSwap (DexType.SUSHISWAP no contrato)
        fee: 0 // Não aplicável para V2
      },
      {
        tokenIn: WETH_ADDRESS,
        tokenOut: WMATIC_ADDRESS,
        dexType: 0, // 0 = Uniswap V2 (SushiSwap)
        fee: 0 // Não aplicável para V2
      }
    ];

    try {
      const tx = await flashLoanArbitrage.initiateArbitrageFromBackend(
        WMATIC_ADDRESS,
        amount,
        steps,
        { gasLimit: 1000000 }
      );
      await tx.wait();
      console.log("Transação de arbitragem iniciada.");
    } catch (error) {
      console.error("Erro ao iniciar arbitragem:", error.message);
      // Se o erro for devido a falta de liquidez ou rota inválida,
      // o teste pode falhar, o que é esperado em um ambiente de fork real.
      // Para um teste mais robusto, considere mocks ou verifique as condições de liquidez.
      throw error;
    }

    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    console.log("Saldo final do owner:", ethers.utils.formatEther(finalOwnerBalance));

    // Verificar se houve lucro (ou pelo menos não perda significativa)
    // Em um ambiente de fork real, o lucro pode variar ou ser zero dependendo das condições de mercado.
    // Para este teste, vamos apenas verificar se o saldo não diminuiu drasticamente.
    expect(finalOwnerBalance).to.be.gte(initialOwnerBalance.sub(ethers.utils.parseEther("0.01"))); // Permitir uma pequena variação de gás
    console.log("Teste de arbitragem concluído com sucesso.");
  });
});