import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// 載入環境變數
dotenv.config();

async function main() {
  console.log("🚀 使用純 ethers.js 部署到 Celo Sepolia...\n");

  // 讀取編譯好的合約
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "SelfProtocolVerifier.sol", "SelfProtocolVerifier.json");

  if (!fs.existsSync(artifactPath)) {
    console.log("❌ 找不到編譯後的合約");
    console.log("請先運行: npx hardhat compile");
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // 連接到 Celo Sepolia
  const provider = new ethers.JsonRpcProvider("https://celo-sepolia-rpc.publicnode.com");
  const privateKey = process.env.CELO_PRIVATE_KEY;

  if (!privateKey) {
    console.log("❌ 找不到 CELO_PRIVATE_KEY 環境變數");
    console.log("請確認 .env 檔案中已設置 CELO_PRIVATE_KEY");
    process.exit(1);
  }

  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("📝 部署者地址:", wallet.address);

  // 檢查餘額
  const balance = await provider.getBalance(wallet.address);
  console.log("💰 部署者餘額:", ethers.formatEther(balance), "CELO\n");

  if (balance === 0n) {
    console.log("⚠️  警告：部署者餘額為 0");
    process.exit(1);
  }

  // 部署合約
  console.log("⏳ 正在部署 SelfProtocolVerifier...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const contract = await factory.deploy();
  console.log("📦 部署交易已發送:", contract.deploymentTransaction()?.hash);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ SelfProtocolVerifier 已部署到:", contractAddress);

  // 驗證合約配置
  console.log("\n🔍 驗證合約配置...");
  try {
    const owner = await (contract as any).owner();
    const minAge = await (contract as any).MIN_AGE();
    console.log("  - 合約擁有者:", owner);
    console.log("  - 最低年齡:", minAge.toString());
  } catch (e) {
    console.log("  - 跳過配置驗證（合約已部署）");
  }

  // 保存部署信息
  const deploymentInfo = {
    network: "celo-sepolia",
    chainId: 1301,
    contractName: "SelfProtocolVerifier",
    contractAddress: contractAddress,
    deployerAddress: wallet.address,
    deploymentTime: new Date().toISOString(),
    txHash: contract.deploymentTransaction()?.hash,
    explorer: `https://sepolia.celoscan.io/address/${contractAddress}`,
  };

  const deploymentPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true});
  }

  const filePath = path.join(deploymentPath, "celo-sepolia-latest.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ 部署信息已保存到:", filePath);
  console.log("\n📝 下一步：");
  console.log(`1. 複製合約地址到 backend/.env:`);
  console.log(`   CELO_VERIFIER_CONTRACT=${contractAddress}`);
  console.log(`\n2. 查看合約:`);
  console.log(`   https://sepolia.celoscan.io/address/${contractAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失敗:", error);
    process.exit(1);
  });
