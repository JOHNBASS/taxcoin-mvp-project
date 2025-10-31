#!/bin/bash

# Sui 智能合約互動腳本
# 提供常用的合約互動命令範例

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 TAXCOIN 智能合約互動工具${NC}"
echo ""

# 檢查環境變數
if [ -z "$PACKAGE_ID" ]; then
    echo -e "${YELLOW}⚠️  警告: PACKAGE_ID 未設置${NC}"
    echo "請先設置環境變數: export PACKAGE_ID=<your_package_id>"
    echo ""
fi

if [ -z "$TREASURY_CAP" ]; then
    echo -e "${YELLOW}⚠️  警告: TREASURY_CAP 未設置${NC}"
    echo "請先設置環境變數: export TREASURY_CAP=<your_treasury_cap_id>"
    echo ""
fi

if [ -z "$ADMIN_CAP" ]; then
    echo -e "${YELLOW}⚠️  警告: ADMIN_CAP 未設置${NC}"
    echo "請先設置環境變數: export ADMIN_CAP=<your_admin_cap_id>"
    echo ""
fi

# 功能選單
echo "請選擇操作:"
echo "1. 鑄造 TaxCoin"
echo "2. 查詢 TaxCoin 餘額"
echo "3. 創建退稅申請 NFT"
echo "4. 創建 RWA Token"
echo "5. 創建投資池"
echo "6. 投資到池"
echo "7. 查詢池狀態"
echo "8. 結算池"
echo "9. 領取收益"
echo "0. 退出"
echo ""

read -p "請輸入選項 (0-9): " choice

case $choice in
    1)
        echo -e "${GREEN}鑄造 TaxCoin${NC}"
        read -p "接收者地址: " recipient
        read -p "金額 (以 10^8 為單位): " amount
        read -p "申請 ID: " claim_id

        sui client call \
            --package $PACKAGE_ID \
            --module taxcoin \
            --function mint \
            --args $TREASURY_CAP $ADMIN_CAP $amount $recipient "\"$claim_id\"" \
            --gas-budget 10000000
        ;;

    2)
        echo -e "${GREEN}查詢 TaxCoin 餘額${NC}"
        read -p "Coin Object ID: " coin_id

        sui client object $coin_id
        ;;

    3)
        echo -e "${GREEN}創建退稅申請 NFT${NC}"
        read -p "申請 ID: " claim_id
        read -p "DID: " did
        read -p "原始金額 (分): " original_amount
        read -p "退稅金額 (分): " tax_amount
        read -p "商家名稱: " merchant
        read -p "購買日期 (Unix 時間戳): " purchase_date
        read -p "收據 Hash: " receipt_hash
        read -p "接收者地址: " recipient

        sui client call \
            --package $PACKAGE_ID \
            --module tax_claim_nft \
            --function mint \
            --args $ADMIN_CAP "\"$claim_id\"" "\"$did\"" $original_amount $tax_amount "\"$merchant\"" $purchase_date "\"$receipt_hash\"" $recipient \
            --gas-budget 10000000
        ;;

    4)
        echo -e "${GREEN}創建 RWA Token${NC}"
        read -p "申請 ID: " claim_id
        read -p "金額 (分): " amount
        read -p "年化利率 (基點, 200=2%): " rate
        read -p "到期日 (Unix 時間戳): " maturity
        read -p "池 ID: " pool_id

        sui client call \
            --package $PACKAGE_ID \
            --module rwa_token \
            --function create_token \
            --args $ADMIN_CAP "\"$claim_id\"" $amount $rate $maturity "\"$pool_id\"" \
            --gas-budget 10000000
        ;;

    5)
        echo -e "${GREEN}創建投資池${NC}"
        read -p "池名稱: " name
        read -p "描述: " description
        read -p "目標金額 (分): " target
        read -p "收益率 (基點, 200=2%): " yield_rate
        read -p "風險等級 (0=低,1=中,2=高): " risk
        read -p "到期日 (Unix 時間戳): " maturity

        sui client call \
            --package $PACKAGE_ID \
            --module rwa_pool \
            --function create_pool \
            --args $ADMIN_CAP "\"$name\"" "\"$description\"" $target $yield_rate $risk $maturity "[]" \
            --gas-budget 10000000
        ;;

    6)
        echo -e "${GREEN}投資到池${NC}"
        read -p "Pool Object ID: " pool_id
        read -p "Payment Coin ID: " coin_id

        sui client call \
            --package $PACKAGE_ID \
            --module rwa_pool \
            --function invest \
            --args $pool_id $coin_id \
            --gas-budget 10000000
        ;;

    7)
        echo -e "${GREEN}查詢池狀態${NC}"
        read -p "Pool Object ID: " pool_id

        sui client object $pool_id
        ;;

    8)
        echo -e "${GREEN}結算池${NC}"
        read -p "Pool Object ID: " pool_id

        sui client call \
            --package $PACKAGE_ID \
            --module rwa_pool \
            --function settle_pool \
            --args $ADMIN_CAP $pool_id \
            --gas-budget 10000000
        ;;

    9)
        echo -e "${GREEN}領取收益${NC}"
        read -p "Pool Object ID: " pool_id
        read -p "Share Object ID: " share_id

        sui client call \
            --package $PACKAGE_ID \
            --module rwa_pool \
            --function claim_yield \
            --args $pool_id $share_id \
            --gas-budget 10000000
        ;;

    0)
        echo "👋 再見!"
        exit 0
        ;;

    *)
        echo -e "${YELLOW}❌ 無效的選項${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ 操作完成${NC}"
