const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await ethers.getSigners();
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanArbitrage = FlashLoanArbitrage.attach(process.env.FLASHLOAN_ARBITRAGE_CONTRACT_ADDRESS);

  console.log("Executando arbitragem com conta:", owner.address);
  console.log("Saldo atual:", ethers.utils.formatEther(await owner.getBalance()), "MATIC");

  // Configuração da rota de arbitragem (WMATIC -> USDC -> WETH -> WMATIC)
  // DexType enum: UNISWAP_V2 = 0, UNISWAP_V3 = 1, SUSHISWAP = 2, QUICKSWAP = 3
  const steps = [
    {
      tokenIn: process.env.WMATIC_ADDRESS,
      tokenOut: process.env.USDC_ADDRESS,
      dexType: 1, // 1 = UniswapV3
      fee: 3000 // 0.3% fee tier
    },
    {
      tokenIn: process.env.USDC_ADDRESS,
      tokenOut: process.env.WETH_ADDRESS,
      dexType: 2, // 2 = SushiSwap
      fee: 0
    },
    {
      tokenIn: process.env.WETH_ADDRESS,
      tokenOut: process.env.WMATIC_ADDRESS,
      dexType: 3, // 3 = QuickSwap (corrigido de 0 para 3)
      fee: 0
    }
  ];

  const amount = ethers.utils.parseUnits("100", 18); // 100 WMATIC (valor reduzido para teste)

  // Enviar 0.2 MATIC para o contrato cobrir taxas
  await owner.sendTransaction({
    to: process.env.FLASHLOAN_ARBITRAGE_CONTRACT_ADDRESS,
    value: ethers.utils.parseEther("0.2")
  });

  console.log("Iniciando flash loan...");
  const tx = await flashLoanArbitrage.initiateArbitrageFromBackend(
    process.env.WMATIC_ADDRESS,
    amount,
    steps,
    {
      gasLimit: 5000000,
      gasPrice: ethers.utils.parseUnits("30", "gwei") // Preço fixo de gás
    }
  );

  const receipt = await tx.wait();
  console.log("Transação confirmada:", receipt.transactionHash);
  console.log("Gás utilizado:", receipt.gasUsed.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });