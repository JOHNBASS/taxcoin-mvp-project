import { ethers } from "hardhat";

async function main() {
  const address = "0xc98200a3B2d20Df6Fd50090DC9f22770fb56F13f";
  
  console.log("🔍 檢查 Celo Alfajores 錢包餘額...\n");
  console.log("錢包地址:", address);
  console.log("Celoscan:", `https://alfajores.celoscan.io/address/${address}\n`);

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org"
    );

    const balance = await provider.getBalance(address);
    const balanceInCelo = ethers.formatEther(balance);

    console.log("💰 當前餘額:", balanceInCelo, "CELO");
    
    if (parseFloat(balanceInCelo) === 0) {
      console.log("\n❌ 餘額為 0，需要領取測試 CELO");
      console.log("\n請嘗試以下方法：");
      console.log("1. Celo Discord Faucet: https://discord.gg/celo");
      console.log("2. 等待幾分鐘後重試網頁 Faucet");
      console.log("3. 更換網路（關閉 VPN）後重試");
      console.log("4. 生成新錢包地址重試");
    } else {
      console.log("\n✅ 餘額充足，可以開始部署！");
      console.log("\n下一步:");
      console.log("npx hardhat run scripts/deploy-verifier.ts --network celo-alfajores");
    }

    const blockNumber = await provider.getBlockNumber();
    console.log("\n📊 網路資訊:");
    console.log("- 最新區塊:", blockNumber);
    console.log("- Chain ID: 44787");

  } catch (error) {
    console.error("\n❌ 檢查失敗:", error instanceof Error ? error.message : error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
