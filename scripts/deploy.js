const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Iniciando deploy dos contratos de flash loan...\n");

  // Obter o deployer
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", deployer.address);
  console.log("💰 Saldo:", ethers.utils.formatEther(await deployer.getBalance()), "MATIC\n");

  // Deploy do contrato de flash loan (simplificado)
  console.log("📦 Deployando contrato de flash loan...");
  
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanContract = await FlashLoanArbitrage.deploy();
  
  await flashLoanContract.deployed();
  
  console.log("✅ FlashLoanArbitrage deployado em:", flashLoanContract.address);
  console.log("📋 Hash da transação:", flashLoanContract.deployTransaction.hash);

  // Verificar o contrato
  console.log("\n🔍 Verificando contrato...");
  try {
    await hre.run("verify:verify", {
      address: flashLoanContract.address,
      constructorArguments: [],
    });
    console.log("✅ Contrato verificado no Polygonscan");
  } catch (error) {
    console.log("⚠️  Erro na verificação:", error.message);
  }

  // Salvar endereços em arquivo
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      FlashLoanArbitrage: flashLoanContract.address
    },
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    `deployments/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Informações de deploy salvas em:", `deployments/${hre.network.name}.json`);
  console.log("\n🎉 Deploy concluído com sucesso!");
  console.log("\n📋 Próximos passos:");
  console.log("1. Atualize o arquivo .env com o endereço do contrato:");
  console.log(`   FLASH_LOAN_CONTRACT_ADDRESS=${flashLoanContract.address}`);
  console.log("2. Execute o bot de arbitragem:");
  console.log("   npm start");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erro no deploy:", error);
    process.exit(1);
  }); 