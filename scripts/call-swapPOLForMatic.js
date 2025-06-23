const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  // Parâmetros do swap
  const amountIn = ethers.utils.parseUnits("1", 18); // 1 POL (ajuste se necessário)
  const amountOutMin = ethers.utils.parseUnits("0.01", 18); // Mínimo de WMATIC esperado (ajuste se necessário)
  const fee = 3000; // Pool fee Uniswap V3 (0.3%)

  // Endereço do contrato FlashLoanArbitrage
  const contractAddress = process.env.FLASH_LOAN_CONTRACT_ADDRESS;
  if (!contractAddress) throw new Error("Defina FLASH_LOAN_CONTRACT_ADDRESS no .env");

  // ABI mínima para a função
  const abi = [
    "function swapPOLForMatic(uint256 amountIn, uint256 amountOutMin, uint24 fee) external"
  ];

  // Obter signer
  const [signer] = await ethers.getSigners();
  const contract = new ethers.Contract(contractAddress, abi, signer);

  // Aprovar POL para o contrato, se necessário
  const polAddress = "0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6";
  const pol = new ethers.Contract(polAddress, ["function approve(address,uint256) external returns (bool)", "function allowance(address,address) view returns (uint256)"], signer);
  const allowance = await pol.allowance(signer.address, contractAddress);
  if (allowance.lt(amountIn)) {
    console.log("Aprovando POL para o contrato...");
    const tx = await pol.approve(contractAddress, ethers.constants.MaxUint256);
    await tx.wait();
    console.log("Aprovação concluída");
  }

  // Chamar swapPOLForMatic
  console.log("Chamando swapPOLForMatic...");
  const tx = await contract.swapPOLForMatic(amountIn, amountOutMin, fee);
  console.log("Tx enviada:", tx.hash);
  await tx.wait();
  console.log("Swap e unwrap concluídos!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 