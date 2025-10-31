#!/bin/bash

# TAXCOIN MVP 環境變數自動設置腳本
# 用途: 自動生成所有必要的環境變數
# 使用: ./scripts/setup-env.sh

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         TAXCOIN MVP 環境變數設置工具 v1.0.0              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未安裝 Node.js"
    echo "   請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

# 檢查是否已存在 .env
if [ -f "backend/.env" ]; then
    echo "⚠️  backend/.env 已存在"
    read -p "是否覆蓋現有檔案? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ 已取消設置"
        exit 0
    fi
    # 備份舊檔案
    timestamp=$(date +%Y%m%d_%H%M%S)
    mv backend/.env "backend/.env.backup_$timestamp"
    echo "✅ 已備份舊檔案到 backend/.env.backup_$timestamp"
    echo ""
fi

# 生成 JWT_SECRET (64 字元)
echo "🔑 正在生成 JWT_SECRET..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "✅ JWT_SECRET 已生成 (128 字元)"

# 生成資料庫密碼 (32 字元)
echo "🔒 正在生成資料庫密碼..."
DB_PASSWORD="taxcoin_$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")"
echo "✅ 資料庫密碼已生成"
echo ""

# 詢問是否需要生成 Sui 密鑰
echo "🔑 Sui 區塊鏈設置"
echo "─────────────────────────────────────────────────────────"
read -p "是否需要生成新的 Sui 密鑰對? (Y/n): " generate_sui

if [ "$generate_sui" = "n" ] || [ "$generate_sui" = "N" ]; then
    # 手動輸入
    echo ""
    echo "請手動輸入 Sui 錢包資訊:"
    read -p "Sui 私鑰 (Base64): " SUI_PRIVATE_KEY
    read -p "Sui 地址 (0x...): " SUI_WALLET_ADDRESS
else
    # 自動生成
    echo "📦 正在生成 Sui 密鑰對..."
    echo ""

    # 檢查並安裝依賴
    if [ ! -d "backend/node_modules/@mysten" ]; then
        echo "📥 正在安裝 @mysten/sui.js..."
        cd backend
        npm install @mysten/sui.js --silent
        cd ..
        echo "✅ 依賴安裝完成"
    fi

    # 執行 Sui 密鑰生成
    SUI_OUTPUT=$(node scripts/generate-sui-keypair.js 2>&1)

    # 提取私鑰和地址
    SUI_PRIVATE_KEY=$(echo "$SUI_OUTPUT" | grep -A 1 "🔐 私鑰" | tail -1 | tr -d ' ')
    SUI_WALLET_ADDRESS=$(echo "$SUI_OUTPUT" | grep -A 1 "📍 Sui 地址" | tail -1 | tr -d ' ')

    if [ -z "$SUI_PRIVATE_KEY" ] || [ -z "$SUI_WALLET_ADDRESS" ]; then
        echo "❌ 錯誤: Sui 密鑰生成失敗"
        echo ""
        echo "請手動執行: node scripts/generate-sui-keypair.js"
        exit 1
    fi

    echo "✅ Sui 密鑰對已生成"
    echo "   地址: $SUI_WALLET_ADDRESS"
fi

echo ""

# 創建 backend/.env 檔案
cat > backend/.env << ENVFILE
# ===== 資料庫設置 =====
DATABASE_URL=postgresql://taxcoin:${DB_PASSWORD}@postgres:5432/taxcoin
DB_PASSWORD=${DB_PASSWORD}

# ===== JWT 設置 =====
# 用於加密和驗證 JWT Token
JWT_SECRET=${JWT_SECRET}

# ===== Sui 區塊鏈 =====
# 私鑰 (請妥善保管,不要分享)
SUI_PRIVATE_KEY=${SUI_PRIVATE_KEY}
# 錢包地址
SUI_WALLET_ADDRESS=${SUI_WALLET_ADDRESS}
# 網路選擇 (testnet / devnet / mainnet)
SUI_NETWORK=testnet
# RPC 端點
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# ===== 伺服器設置 =====
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5004

# ===== 檔案上傳 =====
# 最大檔案大小 5MB
MAX_FILE_SIZE=5242880
# 上傳目錄
UPLOAD_DIR=./uploads

# ===== Gemini AI (可選) =====
# 從 Google AI Studio 取得: https://makersuite.google.com/app/apikey
# 不設置時會使用 Tesseract.js 作為備援
# GEMINI_API_KEY=your-gemini-api-key-here

# ===== Sui 智能合約 (部署後填入) =====
# TaxCoin 智能合約 Package ID
# SUI_TAXCOIN_PACKAGE_ID=0x...
# RWA Pool 智能合約 Package ID
# SUI_RWA_POOL_PACKAGE_ID=0x...
ENVFILE

echo "✅ backend/.env 已創建成功!"
echo ""
echo "📋 環境變數摘要:"
echo "────────────────────────────────────────────────────────"
echo "✅ JWT_SECRET: ${JWT_SECRET:0:20}... (已截斷,共 ${#JWT_SECRET} 字元)"
echo "✅ DB_PASSWORD: ${DB_PASSWORD:0:20}... (已截斷)"
echo "✅ SUI_WALLET_ADDRESS: $SUI_WALLET_ADDRESS"
echo "✅ SUI_NETWORK: testnet"
echo "────────────────────────────────────────────────────────"
echo ""

# 創建前端 .env
if [ ! -f "frontend/.env" ]; then
    echo "📝 正在創建 frontend/.env..."
    cat > frontend/.env << FRONTENDENV
# ===== API 設置 =====
VITE_API_BASE_URL=http://localhost:3000/api/v1

# ===== Sui 配置 =====
VITE_SUI_NETWORK=testnet
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# ===== Sui 智能合約 (部署後填入) =====
# VITE_SUI_PACKAGE_ID=0x...
FRONTENDENV
    echo "✅ frontend/.env 已創建"
    echo ""
fi

echo "⚠️  安全提醒:"
echo "────────────────────────────────────────────────────────"
echo "1. 請妥善保管 .env 檔案,不要與他人分享"
echo "2. 確認 .env 在 .gitignore 中 (已預設包含)"
echo "3. 不要將 .env 提交到 Git"
echo "4. 僅在測試網使用此 Sui 私鑰"
echo "5. 生產環境應使用不同的密鑰和錢包"
echo ""

echo "📖 下一步:"
echo "────────────────────────────────────────────────────────"
echo "1. 從水龍頭取得測試 SUI:"
echo "   訪問: https://faucet.sui.io/"
echo "   輸入地址: $SUI_WALLET_ADDRESS"
echo ""
echo "2. 啟動應用:"
echo "   ./scripts/start-all.sh"
echo ""
echo "3. 初始化資料庫:"
echo "   ./scripts/db-setup.sh"
echo ""

echo "📚 相關文件:"
echo "────────────────────────────────────────────────────────"
echo "- 環境變數說明: docs/ENVIRONMENT_VARIABLES_SETUP.md"
echo "- Sui 錢包設置: docs/SUI_WALLET_SETUP.md"
echo "- 快速開始: QUICK_START.md"
echo ""

echo "✅ 環境變數設置完成! 🎉"
echo ""
