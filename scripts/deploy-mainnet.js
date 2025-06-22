const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deployando contratos com a conta:", deployer.address);
  console.log("Saldo da conta:", ethers.utils.formatEther(await deployer.getBalance()), "MATIC");

  // 1. Deploy do contrato FlashLoanArbitrage
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanArbitrage = await FlashLoanArbitrage.deploy();

  await flashLoanArbitrage.deployed();

  console.log("FlashLoanArbitrage deployed to:", flashLoanArbitrage.address);

  // 2. Enviar MATIC para taxas do contrato
  const tx = await deployer.sendTransaction({
    to: flashLoanArbitrage.address,
    value: ethers.utils.parseEther("1.0") // 1 MATIC para taxas
  });
  await tx.wait();

  console.log("1 MATIC enviado para o contrato para cobrir taxas");
  console.log("Saldo do contrato:", ethers.utils.formatEther(await ethers.provider.getBalance(flashLoanArbitrage.address)), "MATIC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });