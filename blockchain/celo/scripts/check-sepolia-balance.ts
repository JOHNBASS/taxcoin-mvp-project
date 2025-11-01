import { ethers } from "hardhat";

async function main() {
  const address = "0xc98200a3B2d20Df6Fd50090DC9f22770fb56F13f";
  
  console.log("🔍 檢查 Celo Sepolia 錢包餘額...\n");
  console.log("錢包地址:", address);
  console.log("Celoscan:", `https://sepolia.celoscan.io/address/${address}\n`);

  try {
    // 嘗試多個 RPC 端點
    const rpcUrls = [
      "https://celo-sepolia.blockpi.network/v1/rpc/public",
      "https://forno.celo-testnet.org",
      "https://alfajores-forno.celo-testnet.org"
    ];

    let provider = null;
    for (const rpc of rpcUrls) {
      try {
        console.log(`嘗試 RPC: ${rpc}...`);
        provider = new ethers.JsonRpcProvider(rpc);
        await provider.getBlockNumber(); // 測試連接
        console.log(`✅ 連接成功\n`);
        break;
      } catch (e) {
        console.log(`❌ 失敗: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (!provider) {
      throw new Error("無法連接到任何 RPC 端點");
    }

    const balance = await provider.getBalance(address);
    const balanceInCelo = ethers.formatEther(balance);

    console.log("💰 當前餘額:", balanceInCelo, "CELO");
    
    if (parseFloat(balanceInCelo) === 0) {
      console.log("\n❌ 餘額為 0");
    } else {
      console.log("\n✅ 餘額充足，可以開始部署！");
      console.log("\n下一步:");
      console.log("npx hardhat run scripts/deploy-verifier.ts --network celo-sepolia");
    }

    const blockNumber = await provider.getBlockNumber();
    console.log("\n📊 網路資訊:");
    console.log("- 最新區塊:", blockNumber);
    console.log("- Chain ID: 1301 (Celo Sepolia)");

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
