#!/bin/bash

####################################################################
# 合併 TaxCoin 腳本
#
# 功能:
# 將錢包中所有同一版本的 TaxCoin Coin 對象合併成一個
#
# 使用方式:
#   ./scripts/merge-taxcoins.sh <錢包地址>
####################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

WALLET_ADDRESS=${1:-"0x226e26621e9766414b728946a2d8bbca1667608a008ac80e92df60ab03bc6306"}
PACKAGE_ID="0x3c8807627d553281d66d5f56a85cb23b73a32d4a98b7832fdd5ce4857f977da1"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           合併 TaxCoin Coin 對象                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}查詢錢包中的 TaxCoin...${NC}"
echo "  錢包地址: $WALLET_ADDRESS"
echo "  Package ID: $PACKAGE_ID"
echo ""

# 使用 sui client merge-coin 命令
sui client merge-coin \
  --coin-type "${PACKAGE_ID}::taxcoin::TAXCOIN" \
  --gas-budget 10000000

echo ""
echo -e "${GREEN}✅ TaxCoin 合併完成！${NC}"
echo ""
echo -e "${CYAN}現在你可以用 'sui client objects' 查看合併後的結果${NC}"
echo ""
