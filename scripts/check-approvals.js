const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [owner] = await ethers.getSigners();
  const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
  const flashLoanArbitrage = FlashLoanArbitrage.attach(process.env.FLASH_LOAN_CONTRACT_ADDRESS);

  console.log("Verificando aprovações de tokens...");
  console.log("Contrato:", flashLoanArbitrage.address);

  // Endereços dos tokens
  const WMATIC = process.env.WMATIC_ADDRESS;
  const USDC = process.env.USDC_ADDRESS;
  const WETH = process.env.WETH_ADDRESS;
  const AAVE_POOL = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

  // ABI básico para ERC20
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  // Função para verificar aprovação
  async function checkApproval(tokenAddress, spender, tokenName) {
    const token = new ethers.Contract(tokenAddress, erc20Abi, owner);
    
    try {
      const allowance = await token.allowance(flashLoanArbitrage.address, spender);
      const balance = await token.balanceOf(flashLoanArbitrage.address);
      const decimals = await token.decimals();
      
      console.log(`\n${tokenName}:`);
      console.log(`  Endereço: ${tokenAddress}`);
      console.log(`  Saldo do contrato: ${ethers.utils.formatUnits(balance, decimals)}`);
      console.log(`  Allowance para ${spender}: ${ethers.utils.formatUnits(allowance, decimals)}`);
      
      if (allowance.isZero()) {
        console.log(`  ⚠️  Aprovação necessária para ${spender}`);
        return false;
      } else {
        console.log(`  ✅ Aprovação OK`);
        return true;
      }
    } catch (error) {
      console.log(`  ❌ Erro ao verificar ${tokenName}:`, error.message);
      return false;
    }
  }

  // Verificar aprovações para Aave Pool
  console.log("\n=== APROVAÇÕES PARA AAVE POOL ===");
  await checkApproval(WMATIC, AAVE_POOL, "WMATIC");
  await checkApproval(USDC, AAVE_POOL, "USDC");
  await checkApproval(WETH, AAVE_POOL, "WETH");

  // Verificar aprovações para routers
  const routers = {
    "Uniswap V3": "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    "SushiSwap": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    "QuickSwap": "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"
  };

  console.log("\n=== APROVAÇÕES PARA ROUTERS ===");
  for (const [routerName, routerAddress] of Object.entries(routers)) {
    console.log(`\n${routerName} (${routerAddress}):`);
    await checkApproval(WMATIC, routerAddress, "WMATIC");
    await checkApproval(USDC, routerAddress, "USDC");
    await checkApproval(WETH, routerAddress, "WETH");
  }

  // Verificar saldo de MATIC do contrato
  const contractBalance = await ethers.provider.getBalance(flashLoanArbitrage.address);
  console.log(`\n=== SALDO DO CONTRATO ===`);
  console.log(`MATIC: ${ethers.utils.formatEther(contractBalance)}`);

  if (contractBalance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("⚠️  Saldo insuficiente para taxas de gás");
    console.log("Execute: npx hardhat run scripts/send-matic.js --network polygon");
  } else {
    console.log("✅ Saldo suficiente para taxas de gás");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 