const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await ethers.getSigners();
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanArbitrage = FlashLoanArbitrage.attach(process.env.FLASH_LOAN_CONTRACT_ADDRESS);

  console.log("Enviando MATIC para o contrato...");
  console.log("De:", owner.address);
  console.log("Para:", flashLoanArbitrage.address);
  console.log("Saldo atual:", ethers.utils.formatEther(await owner.getBalance()), "MATIC");

  const amount = ethers.utils.parseEther("0.5"); // 0.5 MATIC

  try {
    const tx = await owner.sendTransaction({
      to: flashLoanArbitrage.address,
      value: amount,
      gasLimit: 21000,
      gasPrice: ethers.utils.parseUnits("30", "gwei")
    });

    console.log("Transação enviada:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transação confirmada!");
    console.log("Gás usado:", receipt.gasUsed.toString());

    const newBalance = await ethers.provider.getBalance(flashLoanArbitrage.address);
    console.log("Novo saldo do contrato:", ethers.utils.formatEther(newBalance), "MATIC");

  } catch (error) {
    console.error("Erro ao enviar MATIC:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 