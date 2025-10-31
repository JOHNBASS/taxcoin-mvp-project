import { ethers } from "hardhat";

async function main() {
  const address = "0xc98200a3B2d20Df6Fd50090DC9f22770fb56F13f";

  console.log("👀 開始監控錢包餘額...\n");
  console.log("錢包地址:", address);
  console.log("Celoscan:", `https://alfajores.celoscan.io/address/${address}`);
  console.log("\n按 Ctrl+C 停止監控\n");
  console.log("=".repeat(80));

  const provider = new ethers.JsonRpcProvider(
    process.env.CELO_RPC_URL || "https://alfajores-forno.celo-testnet.org"
  );

  let lastBalance = "0";
  let checkCount = 0;
  const maxChecks = 60; // 最多檢查 60 次（5 分鐘）

  const checkBalance = async () => {
    try {
      checkCount++;
      const balance = await provider.getBalance(address);
      const balanceInCelo = ethers.formatEther(balance);
      const timestamp = new Date().toLocaleTimeString('zh-TW');

      // 顯示檢查進度
      process.stdout.write(`\r[${timestamp}] 檢查 #${checkCount}/${maxChecks} | 餘額: ${balanceInCelo} CELO`);

      // 如果餘額變化
      if (balanceInCelo !== lastBalance) {
        console.log("\n");
        console.log("=".repeat(80));
        if (parseFloat(balanceInCelo) > 0) {
          console.log("🎉 太好了！收到測試 CELO！");
          console.log("💰 當前餘額:", balanceInCelo, "CELO");
          console.log("\n✅ 現在可以部署合約了！");
          console.log("\n運行以下命令部署:");
          console.log("npx hardhat run scripts/deploy-verifier.ts --network celo-alfajores");
          console.log("=".repeat(80));
          process.exit(0);
        } else {
          console.log("⚠️  餘額變為 0（可能發送了交易）");
        }
        lastBalance = balanceInCelo;
      }

      // 達到最大檢查次數
      if (checkCount >= maxChecks) {
        console.log("\n");
        console.log("=".repeat(80));
        console.log("⏰ 已檢查 5 分鐘，仍未收到測試 CELO");
        console.log("\n建議:");
        console.log("1. 確認 Faucet 是否成功（查看交易哈希）");
        console.log("2. 確認地址正確：", address);
        console.log("3. 嘗試其他 Faucet（Discord Bot 最可靠）");
        console.log("4. 查看 Celoscan 是否有待處理交易");
        console.log("=".repeat(80));
        process.exit(1);
      }

    } catch (error) {
      console.error("\n❌ 檢查失敗:", error instanceof Error ? error.message : error);
    }
  };

  // 每 5 秒檢查一次
  await checkBalance();
  setInterval(checkBalance, 5000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
