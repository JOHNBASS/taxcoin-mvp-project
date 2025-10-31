#!/bin/bash

####################################################################
# 測試投資功能腳本
#
# 功能:
# 使用 Sui CLI 直接測試投資到投資池
#
# 使用方式:
#   ./scripts/test-invest.sh <投資池地址> <投資金額>
####################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ 找不到 .env 文件${NC}"
    exit 1
fi

source "$ENV_FILE"

POOL_ADDRESS=${1:-"0x734e6054e1433b20eaffd110738ea48a705800fad2263f1265d555d1d7a97890"}
AMOUNT=${2:-100}

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           測試投資功能                                         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}投資信息:${NC}"
echo "  投資池地址: $POOL_ADDRESS"
echo "  投資金額: $AMOUNT TaxCoin"
echo "  Package ID: $SUI_TAXCOIN_PACKAGE_ID"
echo ""

# 獲取當前錢包地址
WALLET_ADDRESS=$(sui client active-address 2>&1 | grep "0x" | head -1)
echo -e "${CYAN}當前錢包: $WALLET_ADDRESS${NC}"
echo ""

# 查找 TaxCoin
echo -e "${CYAN}查找可用的 TaxCoin...${NC}"
COIN_TYPE="${SUI_TAXCOIN_PACKAGE_ID}::taxcoin::TAXCOIN"

# 使用 sui client objects 並過濾 Coin 類型
TAXCOIN_OBJECTS=$(sui client objects --json 2>&1 | grep -v warning | python3 -c "
import json, sys
data = json.load(sys.stdin)
for obj in data:
    obj_type = obj.get('data', {}).get('type', '')
    if 'Coin<' in obj_type and '$COIN_TYPE' in obj_type:
        content = obj['data']['content']
        if 'fields' in content and 'balance' in content['fields']:
            balance = int(content['fields']['balance'])
            if balance > 0:
                print(f'{obj[\"data\"][\"objectId\"]}:{balance}')
                break
")

if [ -z "$TAXCOIN_OBJECTS" ]; then
    echo -e "${RED}❌ 找不到可用的 TaxCoin${NC}"
    exit 1
fi

COIN_ID=$(echo "$TAXCOIN_OBJECTS" | cut -d: -f1)
COIN_BALANCE=$(echo "$TAXCOIN_OBJECTS" | cut -d: -f2)
COIN_BALANCE_READABLE=$((COIN_BALANCE / 100000000))

echo -e "${GREEN}✅ 找到 TaxCoin:${NC}"
echo "  ObjectID: $COIN_ID"
echo "  餘額: $COIN_BALANCE_READABLE TaxCoin"
echo ""

# 計算投資金額（最小單位）
AMOUNT_IN_MIST=$((AMOUNT * 100000000))

if [ $AMOUNT_IN_MIST -gt $COIN_BALANCE ]; then
    echo -e "${RED}❌ TaxCoin 餘額不足${NC}"
    echo "  需要: $AMOUNT TaxCoin"
    echo "  可用: $COIN_BALANCE_READABLE TaxCoin"
    exit 1
fi

echo -e "${CYAN}開始投資...${NC}"
echo ""

# 構建並執行交易
# 注意：sui client call 不支持 Coin 參數，需要使用 PTB
sui client ptb \
    --assign coin @$COIN_ID \
    --split-coins coin "[$AMOUNT_IN_MIST]" \
    --assign payment \
    --move-call "$SUI_TAXCOIN_PACKAGE_ID::rwa_pool::invest" @$POOL_ADDRESS payment \
    --gas-budget 100000000

echo ""
echo -e "${GREEN}✅ 投資完成！${NC}"
echo ""
