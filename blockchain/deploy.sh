#!/bin/bash

###########################################
# Sui 智能合約部署腳本
# 用途: 自動化部署流程
###########################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Sui 智能合約部署腳本                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# 檢查 Sui CLI
if ! command -v sui &> /dev/null; then
    echo -e "${RED}❌ Sui CLI 未安裝${NC}"
    echo -e "${YELLOW}請先安裝 Sui CLI:${NC}"
    echo "  brew install sui"
    exit 1
fi

echo -e "${GREEN}✅ Sui CLI 版本: $(sui --version)${NC}"
echo ""

# 檢查當前錢包
echo -e "${BLUE}[1/5] 檢查錢包資訊...${NC}"
WALLET_ADDRESS=$(sui client active-address 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 錢包未配置${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 錢包地址: ${WALLET_ADDRESS}${NC}"
echo ""

# 檢查 Gas 餘額
echo -e "${BLUE}[2/5] 檢查 Gas 餘額...${NC}"
GAS_OUTPUT=$(sui client gas 2>&1)

if echo "$GAS_OUTPUT" | grep -q "No gas coins"; then
    echo -e "${RED}❌ Gas 餘額不足${NC}"
    echo ""
    echo -e "${YELLOW}請從水龍頭取得測試 SUI:${NC}"
    echo -e "  https://faucet.sui.io/?address=${WALLET_ADDRESS}"
    echo ""
    echo -e "${BLUE}或使用 Discord:${NC}"
    echo "  !faucet ${WALLET_ADDRESS}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Gas 餘額充足${NC}"
echo ""

# 編譯合約
echo -e "${BLUE}[3/5] 編譯 Move 合約...${NC}"
sui move build 2>&1 | grep -E "(BUILDING|error|Success)" || true

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}❌ 編譯失敗${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 合約編譯成功${NC}"
echo ""

# 詢問是否繼續部署
echo -e "${YELLOW}準備部署到 Sui Testnet${NC}"
echo -e "${YELLOW}Gas Budget: 100000000 MIST (0.1 SUI)${NC}"
echo ""
read -p "是否繼續部署? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}部署已取消${NC}"
    exit 0
fi

# 部署合約
echo ""
echo -e "${BLUE}[4/5] 部署智能合約...${NC}"
echo ""

DEPLOY_OUTPUT=$(sui client publish --gas-budget 100000000 2>&1)
DEPLOY_STATUS=$?

if [ $DEPLOY_STATUS -ne 0 ]; then
    echo -e "${RED}❌ 部署失敗${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "$DEPLOY_OUTPUT"
echo ""

# 提取部署資訊
echo -e "${BLUE}[5/5] 提取部署資訊...${NC}"
echo ""

# 提取 Package ID
PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep -A1 "Published Objects" | grep "PackageID:" | awk '{print $2}')

if [ -z "$PACKAGE_ID" ]; then
    PACKAGE_ID=$(echo "$DEPLOY_OUTPUT" | grep "0x" | head -1 | grep -oE "0x[a-f0-9]{64}" | head -1)
fi

# 創建部署資訊檔案
DEPLOYMENT_FILE="./deployment-$(date +%Y%m%d-%H%M%S).txt"

cat > "$DEPLOYMENT_FILE" << EOF
╔══════════════════════════════════════════════════════════╗
║          Sui 智能合約部署資訊                            ║
╚══════════════════════════════════════════════════════════╝

部署時間: $(date)
錢包地址: ${WALLET_ADDRESS}
網路: Testnet

─────────────────────────────────────────────────────────

📦 Package ID:
${PACKAGE_ID}

─────────────────────────────────────────────────────────

⚠️  重要: 請從上方的部署輸出中找到以下 Object IDs:

1. TreasuryCap<TAXCOIN>
2. AdminCap (taxcoin module)
3. AdminCap (tax_claim_nft module)
4. AdminCap (rwa_token module)
5. AdminCap (rwa_pool module)

並更新到 backend/.env 檔案:

SUI_TAXCOIN_PACKAGE_ID=${PACKAGE_ID}
SUI_TAXCOIN_TREASURY_CAP=<從輸出複製>
SUI_TAXCOIN_ADMIN_CAP=<從輸出複製>
SUI_TAX_CLAIM_ADMIN_CAP=<從輸出複製>
SUI_RWA_TOKEN_ADMIN_CAP=<從輸出複製>
SUI_RWA_POOL_ADMIN_CAP=<從輸出複製>

─────────────────────────────────────────────────────────

🔍 查看部署詳情:

Sui Explorer:
https://suiexplorer.com/object/${PACKAGE_ID}?network=testnet

查看你的錢包:
https://suiexplorer.com/address/${WALLET_ADDRESS}?network=testnet

─────────────────────────────────────────────────────────

📚 下一步:

1. 更新 backend/.env 檔案
2. 測試合約功能
3. 整合到後端 API

詳細說明請參考: blockchain/DEPLOYMENT_GUIDE.md

EOF

echo -e "${GREEN}✅ 部署成功!${NC}"
echo ""
echo -e "${GREEN}部署資訊已保存到: ${DEPLOYMENT_FILE}${NC}"
echo ""
echo -e "${BLUE}Package ID: ${PACKAGE_ID}${NC}"
echo ""
echo -e "${YELLOW}請從上方的輸出中提取所有 Object IDs 並更新到 .env${NC}"
echo ""
echo -e "${BLUE}查看完整指南:${NC}"
echo "  cat blockchain/DEPLOYMENT_GUIDE.md"
echo ""
echo -e "${BLUE}在 Sui Explorer 查看:${NC}"
echo "  https://suiexplorer.com/object/${PACKAGE_ID}?network=testnet"
echo ""
