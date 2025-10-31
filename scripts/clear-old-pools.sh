#!/bin/bash

####################################################################
# 清除舊的投資池和投資數據腳本
#
# 功能:
# 1. 清除 MongoDB 中所有舊的投資池記錄
# 2. 清除所有投資記錄
# 3. 準備環境以使用新的 Package ID
#
# 使用方式:
#   chmod +x scripts/clear-old-pools.sh
#   ./scripts/clear-old-pools.sh
####################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NEW_PACKAGE_ID="0x3c8807627d553281d66d5f56a85cb23b73a32d4a98b7832fdd5ce4857f977da1"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           清除舊投資池和投資數據腳本                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 檢查 Docker 是否運行
if ! docker ps | grep -q taxcoin-mongodb; then
    echo -e "${RED}❌ MongoDB 容器未運行${NC}"
    echo -e "${YELLOW}請先啟動服務: docker compose up -d${NC}"
    exit 1
fi

echo -e "${CYAN}[1/4] 檢查當前數據...${NC}"

# 統計當前數據
POOL_COUNT=$(docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "db.RWAPool.countDocuments({})" 2>&1 | tail -1)
INVESTMENT_COUNT=$(docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "db.Investment.countDocuments({})" 2>&1 | tail -1)

echo -e "${BLUE}當前投資池數量: ${POOL_COUNT}${NC}"
echo -e "${BLUE}當前投資記錄數量: ${INVESTMENT_COUNT}${NC}"
echo ""

if [ "$POOL_COUNT" = "0" ] && [ "$INVESTMENT_COUNT" = "0" ]; then
    echo -e "${GREEN}✅ 數據庫已經是空的，無需清理${NC}"
    exit 0
fi

# 確認刪除
echo -e "${YELLOW}⚠️  警告: 此操作將刪除所有投資池和投資記錄！${NC}"
echo -e "${YELLOW}   這是因為合約已重新部署，舊的對象無法使用。${NC}"
echo ""
read -p "確定要繼續嗎？ (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}操作已取消${NC}"
    exit 0
fi

echo -e "${CYAN}[2/4] 備份當前數據...${NC}"

# 創建備份目錄
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/data_backup_${TIMESTAMP}.json"

# 導出數據到備份文件
docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "
  const pools = db.RWAPool.find().toArray();
  const investments = db.Investment.find().toArray();
  print(JSON.stringify({
    timestamp: new Date().toISOString(),
    pools: pools,
    investments: investments
  }, null, 2));
" > "$BACKUP_FILE" 2>&1

echo -e "${GREEN}✅ 數據已備份到: ${BACKUP_FILE}${NC}"
echo ""

echo -e "${CYAN}[3/4] 清除數據庫記錄...${NC}"

# 刪除所有投資和投資池記錄
docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "
  print('正在刪除投資記錄...');
  const investmentResult = db.Investment.deleteMany({});
  print('已刪除投資記錄: ' + investmentResult.deletedCount + ' 筆');

  print('');
  print('正在刪除投資池記錄...');
  const poolResult = db.RWAPool.deleteMany({});
  print('已刪除投資池記錄: ' + poolResult.deletedCount + ' 筆');

  print('');
  print('清理完成！');
"

echo ""
echo -e "${GREEN}✅ 數據庫清理完成${NC}"
echo ""

echo -e "${CYAN}[4/4] 驗證清理結果...${NC}"

# 驗證數據已清空
POOL_COUNT_AFTER=$(docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "db.RWAPool.countDocuments({})" 2>&1 | tail -1)
INVESTMENT_COUNT_AFTER=$(docker exec taxcoin-mongodb mongosh taxcoin --quiet --eval "db.Investment.countDocuments({})" 2>&1 | tail -1)

echo -e "${BLUE}清理後投資池數量: ${POOL_COUNT_AFTER}${NC}"
echo -e "${BLUE}清理後投資記錄數量: ${INVESTMENT_COUNT_AFTER}${NC}"
echo ""

if [ "$POOL_COUNT_AFTER" = "0" ] && [ "$INVESTMENT_COUNT_AFTER" = "0" ]; then
    echo -e "${GREEN}✅ 驗證成功：所有數據已清除${NC}"
else
    echo -e "${RED}❌ 驗證失敗：部分數據未清除${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║               🎉 清理完成！                                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}清理結果:${NC}"
echo "  ✓ 已刪除投資池: ${POOL_COUNT} 筆"
echo "  ✓ 已刪除投資記錄: ${INVESTMENT_COUNT} 筆"
echo "  ✓ 數據已備份到: ${BACKUP_FILE}"
echo ""

echo -e "${BLUE}新的合約資訊:${NC}"
echo "  Package ID: ${NEW_PACKAGE_ID}"
echo "  網絡: Sui Testnet"
echo ""

echo -e "${BLUE}下一步:${NC}"
echo "  1. 在前端創建新的投資池"
echo "  2. 確保使用新的 Package ID"
echo "  3. 測試投資和結算流程"
echo ""

echo -e "${YELLOW}提示:${NC}"
echo "  - 舊的 PoolShare NFT 仍在區塊鏈上，但無法使用"
echo "  - 如果需要恢復數據，請查看備份文件: ${BACKUP_FILE}"
echo ""

echo -e "${GREEN}✨ 現在可以開始使用新的智能合約了！${NC}"
echo ""
