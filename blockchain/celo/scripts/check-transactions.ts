import { ethers } from "hardhat";

async function main() {
  const address = "0xc98200a3B2d20Df6Fd50090DC9f22770fb56F13f";
  
  console.log("🔍 檢查交易歷史...\n");
  console.log("錢包地址:", address);

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org"
    );

    // 獲取餘額
    const balance = await provider.getBalance(address);
    const balanceInCelo = ethers.formatEther(balance);
    console.log("💰 當前餘額:", balanceInCelo, "CELO");

    // 獲取交易數量
    const txCount = await provider.getTransactionCount(address);
    console.log("📊 交易數量:", txCount);

    // 獲取最新區塊
    const blockNumber = await provider.getBlockNumber();
    console.log("📦 最新區塊:", blockNumber);

    // 等待幾秒後再次檢查（可能交易還在確認中）
    console.log("\n⏳ 等待 5 秒後重新檢查...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const newBalance = await provider.getBalance(address);
    const newBalanceInCelo = ethers.formatEther(newBalance);
    console.log("💰 最新餘額:", newBalanceInCelo, "CELO");

    if (parseFloat(newBalanceInCelo) > 0) {
      console.log("\n✅ 太好了！已收到測試 CELO");
      console.log("🚀 現在可以部署合約了！");
      console.log("\n運行:");
      console.log("npx hardhat run scripts/deploy-verifier.ts --network celo-alfajores");
    } else {
      console.log("\n⏰ 還沒收到，請再等待 1-2 分鐘");
      console.log("💡 Faucet 交易可能需要幾分鐘才能確認");
      console.log("\n查看 Celoscan:");
      console.log(`https://alfajores.celoscan.io/address/${address}`);
    }

  } catch (error) {
    console.error("\n❌ 檢查失敗:", error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
