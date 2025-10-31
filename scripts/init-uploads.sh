#!/bin/bash

# TAXCOIN MVP - 初始化上傳目錄腳本
# 功能: 創建必要的上傳目錄結構並設置權限

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info "初始化上傳目錄結構..."

# 創建必要的子目錄
mkdir -p backend/uploads/general
mkdir -p backend/uploads/passport
mkdir -p backend/uploads/id-card
mkdir -p backend/uploads/receipt
mkdir -p backend/uploads/receipts
mkdir -p backend/uploads/kyc
mkdir -p backend/uploads/face
mkdir -p backend/uploads/temp
mkdir -p backend/logs

# 設置權限 (1000:1000 是 Docker node 用戶的 UID:GID)
# 如果在本地開發環境，使用當前用戶
if [ -d "backend/uploads" ]; then
    # 在 Linux 伺服器上，設置為 node 用戶 (UID 1000)
    if [ "$(uname)" = "Linux" ]; then
        print_info "檢測到 Linux 環境，設置 Docker node 用戶權限..."
        sudo chown -R 1000:1000 backend/uploads backend/logs 2>/dev/null || {
            print_info "無法使用 sudo，嘗試使用當前用戶權限..."
            chown -R $(id -u):$(id -g) backend/uploads backend/logs 2>/dev/null || true
        }
        sudo chmod -R 755 backend/uploads 2>/dev/null || chmod -R 755 backend/uploads
        sudo chmod -R 755 backend/logs 2>/dev/null || chmod -R 755 backend/logs
    else
        # macOS 或其他系統，使用當前用戶
        print_info "設置當前用戶權限..."
        chmod -R 755 backend/uploads
        chmod -R 755 backend/logs
    fi
fi

print_success "上傳目錄結構已創建"
print_info "目錄結構:"
echo "  backend/uploads/"
echo "  ├── general/     (一般檔案 - 預設)"
echo "  ├── passport/    (護照照片)"
echo "  ├── id-card/     (身份證照片)"
echo "  ├── receipt/     (收據照片)"
echo "  ├── receipts/    (收據照片複數)"
echo "  ├── kyc/         (KYC 相關)"
echo "  ├── face/        (臉部照片)"
echo "  └── temp/        (臨時檔案)"
echo ""
