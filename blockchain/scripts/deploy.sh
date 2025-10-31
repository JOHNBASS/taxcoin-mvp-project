#!/bin/bash

# Sui 智能合約部署腳本
# 用於部署 TAXCOIN MVP 的所有智能合約到 Sui Testnet

set -e

echo "🚀 開始部署 TAXCOIN 智能合約到 Sui Testnet..."
echo ""

# 檢查 Sui CLI 是否已安裝
if ! command -v sui &> /dev/null; then
    echo "❌ 錯誤: Sui CLI 未安裝"
    echo "請參考: https://docs.sui.io/build/install"
    exit 1
fi

# 檢查是否在正確的目錄
if [ ! -f "Move.toml" ]; then
    echo "❌ 錯誤: 請在 blockchain 目錄下執行此腳本"
    exit 1
fi

# 切換到 Sui testnet
echo "📡 切換到 Sui Testnet..."
sui client switch --env testnet

# 顯示當前使用的地址
echo ""
echo "📍 當前使用的地址:"
sui client active-address
echo ""

# 構建合約
echo "🔨 構建智能合約..."
sui move build

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

echo "✅ 構建成功"
echo ""

# 部署合約
echo "📤 部署智能合約到 Testnet..."
sui client publish --gas-budget 100000000

if [ $? -ne 0 ]; then
    echo "❌ 部署失敗"
    exit 1
fi

echo ""
echo "✅ 部署成功!"
echo ""
echo "📝 請保存以下資訊:"
echo "   - Package ID"
echo "   - AdminCap Object ID (每個模組)"
echo "   - TreasuryCap Object ID (TaxCoin)"
echo ""
echo "💡 提示: 這些 ID 需要更新到後端配置檔 (.env)"
echo ""
