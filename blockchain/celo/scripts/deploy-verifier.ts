import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 開始部署 SelfProtocolVerifier 到 Celo Alfajores Testnet...\n");

  // 獲取部署者帳戶
  const [deployer] = await ethers.getSigners();
  console.log("📝 部署者地址:", deployer.address);

  // 檢查餘額
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 部署者餘額:", ethers.formatEther(balance), "CELO\n");

  if (balance === 0n) {
    console.log("⚠️  警告：部署者餘額為 0");
    console.log("💡 請到 Celo Alfajores Faucet 領取測試 CELO:");
    console.log("   https://faucet.celo.org/alfajores\n");
    process.exit(1);
  }

  // 部署合約
  console.log("⏳ 正在部署 SelfProtocolVerifier...");
  const SelfProtocolVerifier = await ethers.getContractFactory("SelfProtocolVerifier");
  const verifier = await SelfProtocolVerifier.deploy();

  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();

  console.log("✅ SelfProtocolVerifier 已部署到:", verifierAddress);
  console.log("📦 部署交易:", verifier.deploymentTransaction()?.hash);

  // 等待區塊確認
  console.log("\n⏳ 等待 5 個區塊確認...");
  await verifier.deploymentTransaction()?.wait(5);
  console.log("✅ 區塊確認完成\n");

  // 驗證合約配置
  console.log("🔍 驗證合約配置...");
  const owner = await verifier.owner();
  const minAge = await verifier.MIN_AGE();

  console.log("  - 合約擁有者:", owner);
  console.log("  - 最低年齡:", minAge.toString());

  // 檢查禁止國家
  const excludedCountries = ["IRN", "PRK", "SYR", "CUB"];
  console.log("  - 禁止國家:");
  for (const country of excludedCountries) {
    const isExcluded = await verifier.isCountryExcluded(country);
    console.log(`    ${country}: ${isExcluded ? "✅ 已禁止" : "❌ 未禁止"}`);
  }

  // 保存部署信息
  const deploymentInfo = {
    network: "celo-alfajores",
    chainId: 44787,
    contractName: "SelfProtocolVerifier",
    contractAddress: verifierAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
    txHash: verifier.deploymentTransaction()?.hash,
    blockNumber: verifier.deploymentTransaction()?.blockNumber,
    explorer: `https://alfajores.celoscan.io/address/${verifierAddress}`,
    config: {
      owner: owner,
      minAge: minAge.toString(),
      excludedCountries: excludedCountries
    }
  };

  // 保存到文件
  const deploymentPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const fileName = `SelfProtocolVerifier-${Date.now()}.json`;
  const filePath = path.join(deploymentPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  // 同時保存最新部署信息
  const latestPath = path.join(deploymentPath, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n✅ 部署信息已保存到:", filePath);
  console.log("✅ 最新部署信息:", latestPath);

  console.log("\n" + "=".repeat(80));
  console.log("📋 部署摘要");
  console.log("=".repeat(80));
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("=".repeat(80));

  console.log("\n🎉 部署完成！\n");

  console.log("📝 後續步驟：");
  console.log("1. 複製合約地址到 backend/.env:");
  console.log(`   CELO_VERIFIER_CONTRACT=${verifierAddress}`);
  console.log("\n2. 複製合約地址到 frontend/.env:");
  console.log(`   VITE_CELO_VERIFIER_CONTRACT=${verifierAddress}`);
  console.log("\n3. 在 Celoscan 驗證合約（可選）:");
  console.log(`   npx hardhat verify --network celo-alfajores ${verifierAddress}`);
  console.log("\n4. 查看合約:");
  console.log(`   https://alfajores.celoscan.io/address/${verifierAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失敗:", error);
    process.exit(1);
  });
