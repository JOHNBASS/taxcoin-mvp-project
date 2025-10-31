#!/bin/bash

# 快速更新錢包腳本
# 使用方法: ./scripts/update-wallet.sh <PRIVATE_KEY>

if [ -z "$1" ]; then
  echo "❌ 錯誤：請提供私鑰"
  echo "使用方法: ./scripts/update-wallet.sh 0x..."
  exit 1
fi

PRIVATE_KEY=$1

echo "🔄 更新 blockchain/celo/.env..."

# 備份現有 .env
if [ -f .env ]; then
  cp .env .env.backup
  echo "✅ 已備份 .env 到 .env.backup"
fi

# 更新私鑰
sed -i '' "s|CELO_PRIVATE_KEY=.*|CELO_PRIVATE_KEY=$PRIVATE_KEY|g" .env

echo "✅ 私鑰已更新"

# 提取地址（使用 Node.js）
node << EOF
const ethers = require('ethers');
const wallet = new ethers.Wallet('$PRIVATE_KEY');
console.log('\n📋 錢包資訊:');
console.log('地址:', wallet.address);
console.log('Faucet URL: https://faucet.celo.org/alfajores');
console.log('Celoscan: https://alfajores.celoscan.io/address/' + wallet.address);
EOF

echo ""
echo "🎯 下一步："
echo "1. 到 Faucet 領取測試 CELO"
echo "2. 運行: npx ts-node scripts/check-balance.ts"
echo "3. 部署: npx hardhat run scripts/deploy-verifier.ts --network celo-alfajores"
