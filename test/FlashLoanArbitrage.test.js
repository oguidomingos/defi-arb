const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FlashLoanArbitrage", function () {
  let FlashLoanArbitrage;
  let flashLoanArbitrage;
  let owner;

  // Endereços reais da Polygon Mainnet para tokens e routers
  const WMATIC_ADDRESS = ethers.utils.getAddress("0x0d500B1d8E8ef31E21C99d1Db9A6444d3ADf1270"); // WMATIC
  const USDC_ADDRESS = ethers.utils.getAddress("0x2791Bca1f2de4661ED88A30C99A7a9226C9f7861"); // USDC
  const WETH_ADDRESS = ethers.utils.getAddress("0x7ceb23fd6bc0add59e62ac25578270f7f1a9ac7f"); // WETH

  // Endereços reais de routers Uniswap/Sushi na Polygon Mainnet
  const UNISWAP_V2_ROUTER_ADDRESS = ethers.utils.getAddress("0x1b02dA8Cb0d097e5387A095520fBc3fD7Ef519Dc"); // SushiSwap Router (Uniswap V2 compatible)
  const UNISWAP_V3_ROUTER_ADDRESS = ethers.utils.getAddress("0x68b3465833fb72A70ecDF485E0E248bf280eeFaa"); // Uniswap V3 SwapRouter

  before(async function () {
    [owner] = await ethers.getSigners();
    FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    flashLoanArbitrage = await FlashLoanArbitrage.deploy();
    await flashLoanArbitrage.deployed();
    console.log("FlashLoanArbitrage deployado em:", flashLoanArbitrage.address);
  });

  it("deve simular um flashloan e arbitragem com WMATIC, USDC e WETH", async function () {
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    console.log("Saldo inicial do owner:", ethers.utils.formatEther(initialOwnerBalance));

    // Simular um flashloan de 1 WMATIC
    const amount = ethers.utils.parseUnits("1", 18); // 1 WMATIC

    // O flashloanCallback precisa de um caminho de tokens para a arbitragem
    // Exemplo de caminho: WMATIC -> USDC -> WETH -> WMATIC
    const path = [WMATIC_ADDRESS, USDC_ADDRESS, WETH_ADDRESS, WMATIC_ADDRESS];

    // Simular a chamada do flashloan
    // Note: Em um teste real, você precisaria de um mock para o pool de flashloan
    // Para este teste, estamos chamando diretamente a função de arbitragem
    // que simula o fluxo após o flashloan.
    try {
      const tx = await flashLoanArbitrage.initiateArbitrageFromBackend(
        WMATIC_ADDRESS,
        amount,
        path,
        { gasLimit: 1000000 } // Aumentar o gas limit para transações complexas
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