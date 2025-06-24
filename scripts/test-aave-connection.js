const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await ethers.getSigners();
  
  console.log("Testando conexão com Aave Pool...");
  console.log("Conta:", owner.address);

  // ABI do Aave Pool V3
  const aavePoolAbi = [
    "function getReserveData(address asset) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40))",
    "function getReservesList() external view returns (address[])",
    "function getReserveNormalizedVariableDebt(address asset) external view returns (uint256)",
    "function getReserveData(address asset) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40))"
  ];

  const aavePoolAddress = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
  const aavePool = new ethers.Contract(aavePoolAddress, aavePoolAbi, owner);

  // Endereços dos tokens
  const WMATIC = process.env.WMATIC_ADDRESS;
  const USDC = process.env.USDC_ADDRESS;
  const WETH = process.env.WETH_ADDRESS;

  console.log("\n=== TESTANDO CONEXÃO COM AAVE POOL ===");
  
  try {
    // Testar se conseguimos acessar o pool
    console.log("Testando acesso ao pool...");
    const reservesList = await aavePool.getReservesList();
    console.log(`✅ Pool acessível. Número de reservas: ${reservesList.length}`);
    
    // Verificar se WMATIC está na lista de reservas
    const wmaticInReserves = reservesList.includes(WMATIC);
    console.log(`WMATIC nas reservas: ${wmaticInReserves ? "✅ Sim" : "❌ Não"}`);
    
    if (wmaticInReserves) {
      // Obter dados da reserva WMATIC
      console.log("\n=== DADOS DA RESERVA WMATIC ===");
      const reserveData = await aavePool.getReserveData(WMATIC);
      
      // Estrutura dos dados: (configuration, liquidityIndex, variableBorrowIndex, currentLiquidityRate, currentVariableBorrowRate, currentStableBorrowRate, lastUpdateTimestamp, id, aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress, interestRateStrategyAddress)
      
      const availableLiquidity = reserveData[0]; // currentLiquidityRate
      const totalVariableDebt = reserveData[2]; // variableBorrowIndex
      
      console.log(`Liquidez disponível: ${ethers.utils.formatUnits(availableLiquidity, 18)} WMATIC`);
      console.log(`Dívida variável total: ${ethers.utils.formatUnits(totalVariableDebt, 18)} WMATIC`);
      
      // Verificar se há liquidez suficiente para flash loan
      const testAmount = ethers.utils.parseUnits("10", 18); // 10 WMATIC
      if (availableLiquidity.gte(testAmount)) {
        console.log("✅ Liquidez suficiente para flash loan de teste");
      } else {
        console.log("⚠️  Liquidez insuficiente para flash loan de teste");
      }
    }
    
  } catch (error) {
    console.error("❌ Erro ao acessar Aave Pool:", error.message);
  }

  // Testar se o contrato pode ser chamado
  console.log("\n=== TESTANDO CHAMADA DO CONTRATO ===");
  
  try {
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    const flashLoanArbitrage = FlashLoanArbitrage.attach(process.env.FLASH_LOAN_CONTRACT_ADDRESS);
    
    // Verificar se o contrato existe
    const code = await ethers.provider.getCode(flashLoanArbitrage.address);
    if (code === "0x") {
      console.log("❌ Contrato não encontrado no endereço especificado");
      return;
    }
    
    console.log("✅ Contrato encontrado");
    
    // Verificar se o contrato tem saldo para taxas
    const contractBalance = await ethers.provider.getBalance(flashLoanArbitrage.address);
    console.log(`Saldo do contrato: ${ethers.utils.formatEther(contractBalance)} MATIC`);
    
    if (contractBalance.lt(ethers.utils.parseEther("0.1"))) {
      console.log("⚠️  Saldo insuficiente para taxas. Execute: npx hardhat run scripts/send-matic.js --network polygon");
    } else {
      console.log("✅ Saldo suficiente para taxas");
    }
    
    // Testar se conseguimos chamar uma função do contrato
    try {
      const aavePoolFromContract = await flashLoanArbitrage.AAVE_POOL();
      console.log(`✅ AAVE_POOL do contrato: ${aavePoolFromContract}`);
      
      if (aavePoolFromContract === aavePoolAddress) {
        console.log("✅ Endereço do Aave Pool correto");
      } else {
        console.log("❌ Endereço do Aave Pool incorreto");
      }
      
    } catch (error) {
      console.log("❌ Erro ao acessar AAVE_POOL do contrato:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Erro ao testar contrato:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 