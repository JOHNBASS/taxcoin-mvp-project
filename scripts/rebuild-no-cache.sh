#!/bin/bash

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo -e "${BLUE}🔄 TAXCOIN MVP - 清除快取並重新建置${NC}"
echo "=========================================="
echo ""

# 步驟 1: 停止所有容器
print_step "停止所有容器..."
docker-compose down -v
if [ $? -eq 0 ]; then
    print_success "容器已停止"
else
    print_warning "沒有運行中的容器"
fi

echo ""

# 步驟 2: 清除 Docker 建置快取
print_step "清除 Docker 建置快取..."
docker builder prune -af
if [ $? -eq 0 ]; then
    print_success "建置快取已清除"
else
    print_error "清除建置快取失敗"
fi

echo ""

# 步驟 3: 清除未使用的映像
print_step "清除未使用的 Docker 映像..."
docker image prune -af
if [ $? -eq 0 ]; then
    print_success "未使用的映像已清除"
else
    print_warning "清除映像時出現問題"
fi

echo ""

# 步驟 4: 顯示清除統計
print_step "顯示 Docker 系統資訊..."
docker system df

echo ""
echo -e "${BLUE}=========================================${NC}"
echo ""

# 步驟 5: 重新建置（不使用快取）
print_step "開始重新建置 (不使用快取)..."
print_warning "這可能需要幾分鐘時間..."

echo ""

docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo ""
    print_success "建置成功!"
    echo ""
    print_step "現在啟動服務..."
    docker-compose up -d

    if [ $? -eq 0 ]; then
        echo ""
        print_success "所有服務已啟動!"
        echo ""
        echo -e "${GREEN}📍 服務訪問地址:${NC}"
        echo "  - 前端應用: http://localhost:5004"
        echo "  - 後端 API: http://localhost:3000/api/v1"
        echo "  - API 文件: http://localhost:3000/api-docs"
        echo ""
        print_step "查看容器狀態:"
        docker-compose ps
    else
        print_error "啟動服務失敗"
        exit 1
    fi
else
    echo ""
    print_error "建置失敗!"
    print_warning "請檢查上方的錯誤訊息"
    exit 1
fi

echo ""
print_success "完成!"
echo ""
