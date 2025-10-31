#!/bin/bash

# Sui 智能合約測試腳本
# 執行所有 Move 合約的測試

set -e

echo "🧪 開始測試 TAXCOIN 智能合約..."
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

# 執行測試
echo "🔬 執行單元測試..."
sui move test

if [ $? -ne 0 ]; then
    echo "❌ 測試失敗"
    exit 1
fi

echo ""
echo "✅ 所有測試通過!"
echo ""
