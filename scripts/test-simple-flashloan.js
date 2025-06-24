const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await ethers.getSigners();
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanArbitrage = FlashLoanArbitrage.attach(process.env.FLASH_LOAN_CONTRACT_ADDRESS);

  console.log("Testando flash loan simples com conta:", owner.address);
  console.log("Saldo atual:", ethers.utils.formatEther(await owner.getBalance()), "MATIC");

  // Verificar se o contrato tem saldo para taxas
  const contractBalance = await ethers.provider.getBalance(flashLoanArbitrage.address);
  console.log("Saldo do contrato:", ethers.utils.formatEther(contractBalance), "MATIC");

  if (contractBalance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("Enviando MATIC para o contrato...");
    await owner.sendTransaction({
      to: flashLoanArbitrage.address,
      value: ethers.utils.parseEther("0.2")
    });
    console.log("MATIC enviado com sucesso");
  }

  // Testar flash loan simples com WMATIC
  const wmaticAddress = process.env.WMATIC_ADDRESS;
  const amount = ethers.utils.parseUnits("10", 18); // 10 WMATIC (valor pequeno para teste)
  const data = "0x"; // Dados vazios para teste simples

  console.log("Testando flash loan simples...");
  console.log("Token:", wmaticAddress);
  console.log("Quantidade:", ethers.utils.formatUnits(amount, 18), "WMATIC");

  try {
    const tx = await flashLoanArbitrage.flashLoanSimple(
      flashLoanArbitrage.address, // receiver (o próprio contrato)
      wmaticAddress, // asset
      amount, // amount
      data, // data
      0, // referralCode
      {
        gasLimit: 3000000,
        gasPrice: ethers.utils.parseUnits("30", "gwei")
      }
    );

    console.log("Transação enviada:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transação confirmada!");
    console.log("Status:", receipt.status === 1 ? "Sucesso" : "Falha");
    console.log("Gás usado:", receipt.gasUsed.toString());

    if (receipt.status === 0) {
      console.log("❌ Transação falhou");
      // Tentar obter mais detalhes do erro
      try {
        await flashLoanArbitrage.callStatic.flashLoanSimple(
          flashLoanArbitrage.address,
          wmaticAddress,
          amount,
          data,
          0
        );
      } catch (error) {
        console.log("Erro detalhado:", error.message);
      }
    } else {
      console.log("✅ Flash loan executado com sucesso!");
    }

  } catch (error) {
    console.error("❌ Erro ao executar flash loan:", error.message);
    
    // Tentar simular a transação para obter mais detalhes
    try {
      console.log("Simulando transação...");
      await flashLoanArbitrage.callStatic.flashLoanSimple(
        flashLoanArbitrage.address,
        wmaticAddress,
        amount,
        data,
        0
      );
    } catch (simError) {
      console.log("Erro na simulação:", simError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 