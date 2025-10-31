#!/bin/bash

####################################################################
# 鑄造測試用 TaxCoin 腳本
#
# 功能:
# 使用 Admin 權限鑄造 TaxCoin 到指定錢包用於測試
#
# 使用方式:
#   ./scripts/mint-test-taxcoin.sh <錢包地址> <數量>
#   例如: ./scripts/mint-test-taxcoin.sh 0x226e26621e9766414b728946a2d8bbca1667608a008ac80e92df60ab03bc6306 10000
####################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 讀取 .env 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 找不到 .env 文件: $ENV_FILE${NC}"
    exit 1
fi

# 讀取環境變數
source "$ENV_FILE"

RECIPIENT_ADDRESS=${1:-"0x226e26621e9766414b728946a2d8bbca1667608a008ac80e92df60ab03bc6306"}
AMOUNT=${2:-10000}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           鑄造測試用 TaxCoin                                   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}鑄造資訊:${NC}"
echo "  收款地址: $RECIPIENT_ADDRESS"
echo "  數量: $AMOUNT TaxCoin"
echo "  Package ID: $SUI_TAXCOIN_PACKAGE_ID"
echo "  Treasury Cap: $SUI_TAXCOIN_TREASURY_CAP"
echo "  Admin Cap: $SUI_TAXCOIN_ADMIN_CAP"
echo ""

# 確認
read -p "確定要鑄造嗎？ (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

echo -e "${CYAN}開始鑄造...${NC}"

# 計算最小單位（8位小數）
AMOUNT_IN_MIST=$((AMOUNT * 100000000))

# 生成唯一的 claim_id
CLAIM_ID="test_mint_$(date +%s)"

# 構建交易
TX_OUTPUT=$(sui client call \
    --package "$SUI_TAXCOIN_PACKAGE_ID" \
    --module "taxcoin" \
    --function "mint" \
    --args \
        "$SUI_TAXCOIN_TREASURY_CAP" \
        "$SUI_TAXCOIN_ADMIN_CAP" \
        "$AMOUNT_IN_MIST" \
        "$RECIPIENT_ADDRESS" \
        "[$CLAIM_ID]" \
    --gas-budget 100000000 \
    2>&1)

echo ""
echo -e "${BLUE}交易輸出:${NC}"
echo "$TX_OUTPUT"
echo ""

if echo "$TX_OUTPUT" | grep -q "Status : Success"; then
    echo -e "${GREEN}✅ 鑄造成功！${NC}"
    echo ""

    # 提取交易哈希
    TX_HASH=$(echo "$TX_OUTPUT" | grep "Transaction Digest" | awk '{print $NF}')
    echo -e "${BLUE}交易哈希: $TX_HASH${NC}"
    echo -e "${BLUE}Sui Explorer: https://suiexplorer.com/txblock/$TX_HASH?network=testnet${NC}"
    echo ""

    # 提取鑄造的 Coin ObjectID
    COIN_ID=$(echo "$TX_OUTPUT" | grep -A20 "Created Objects" | grep "ObjectID" | head -1 | awk '{print $NF}')
    if [ -n "$COIN_ID" ]; then
        echo -e "${GREEN}✅ 新鑄造的 TaxCoin ObjectID: $COIN_ID${NC}"
        echo -e "${BLUE}Sui Explorer: https://suiexplorer.com/object/$COIN_ID?network=testnet${NC}"
    fi

    echo ""
    echo -e "${GREEN}🎉 $AMOUNT TaxCoin 已成功鑄造到 $RECIPIENT_ADDRESS${NC}"
else
    echo -e "${RED}❌ 鑄造失敗${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}現在可以使用這些 TaxCoin 進行投資測試了！${NC}"
echo ""
