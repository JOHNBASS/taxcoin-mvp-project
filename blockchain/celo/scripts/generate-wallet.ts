import { ethers } from "ethers";

async function main() {
  console.log("🔐 生成新的 Celo 測試錢包...\n");

  // 生成隨機錢包
  const wallet = ethers.Wallet.createRandom();

  console.log("✅ 錢包已生成！\n");
  console.log("📋 錢包資訊：");
  console.log("=".repeat(80));
  console.log("地址 (Address):", wallet.address);
  console.log("私鑰 (Private Key):", wallet.privateKey);
  console.log("助記詞 (Mnemonic):", wallet.mnemonic?.phrase);
  console.log("=".repeat(80));

  console.log("\n⚠️  重要提醒：");
  console.log("1. 請妥善保管私鑰和助記詞");
  console.log("2. 這是測試錢包，僅用於開發和測試");
  console.log("3. 切勿在主網使用或存入真實資金");

  console.log("\n📝 下一步：");
  console.log("1. 複製私鑰到 blockchain/celo/.env:");
  console.log(`   CELO_PRIVATE_KEY=${wallet.privateKey}`);
  console.log("\n2. 到 Celo Faucet 領取測試 CELO:");
  console.log(`   https://faucet.celo.org/alfajores`);
  console.log(`   錢包地址: ${wallet.address}`);
  console.log("\n3. 等待 30 秒後檢查餘額:");
  console.log(`   https://alfajores.celoscan.io/address/${wallet.address}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("錯誤:", error);
    process.exit(1);
  });
