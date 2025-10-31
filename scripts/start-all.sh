#!/bin/bash

# TAXCOIN MVP - 一鍵啟動腳本
# 功能: 檢查環境並啟動所有 Docker 服務

set -e  # 遇到錯誤立即退出

# 🚀 啟用 Docker BuildKit (加速構建)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印帶顏色的訊息
print_info() {
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

# 檢查 Docker 是否安裝
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安裝,請先安裝 Docker Desktop"
        echo "下載網址: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon 未運行,請啟動 Docker Desktop"
        exit 1
    fi

    print_success "Docker 檢查通過"
}

# 檢查 .env 檔案
check_env_file() {
    # 檢查後端 .env
    if [ ! -f backend/.env ]; then
        print_warning "backend/.env 檔案不存在"
        print_info "請執行設置腳本: ./scripts/setup-env.sh"
        print_info "或手動創建: cp .env.example backend/.env"
        echo ""
        exit 1
    fi

    # 檢查必要的環境變數
    source backend/.env

    local missing_vars=()

    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-min-32-chars-here" ]; then
        missing_vars+=("JWT_SECRET")
    fi

    if [ -z "$SUI_PRIVATE_KEY" ] || [ "$SUI_PRIVATE_KEY" = "your-sui-private-key-here" ]; then
        missing_vars+=("SUI_PRIVATE_KEY")
    fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "請在 backend/.env 檔案中設置以下環境變數:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        print_info "快速設置: ./scripts/setup-env.sh"
        exit 1
    fi

    # 檢查前端 .env (可選)
    if [ ! -f frontend/.env ]; then
        print_warning "frontend/.env 不存在,將使用預設配置"
    fi

    print_success "環境變數檢查通過"
}

# 停止並清理現有容器
cleanup_containers() {
    print_info "清理現有容器..."
    docker-compose down --remove-orphans 2>/dev/null || true
    print_success "清理完成"
}

# 啟動服務
start_services() {
    print_info "正在啟動 TAXCOIN MVP 服務 (使用構建緩存)..."
    echo ""

    # 使用 BuildKit 緩存加速構建
    # 只有修改的層會重新構建，npm 套件會被緩存
    docker-compose build

    echo ""

    # 啟動服務
    docker-compose up -d

    echo ""
    print_success "所有服務已啟動"
}

# 等待服務就緒
wait_for_services() {
    print_info "等待服務啟動完成..."
    sleep 5

    # 檢查後端健康狀態
    local max_retries=30
    local retry=0

    while [ $retry -lt $max_retries ]; do
        if docker-compose exec -T backend wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health 2>/dev/null; then
            print_success "後端 API 已就緒"
            break
        fi

        retry=$((retry + 1))
        if [ $retry -eq $max_retries ]; then
            print_error "後端 API 啟動超時"
            print_info "請執行 './scripts/logs.sh backend' 查看日誌"
            exit 1
        fi

        sleep 2
    done
}

# 顯示訪問資訊
show_info() {
    echo ""
    echo "======================================"
    echo "  🚀 TAXCOIN MVP 已成功啟動"
    echo "======================================"
    echo ""
    print_info "服務訪問位置:"
    echo "  📱 前端應用: http://localhost:5004"
    echo "  🔧 後端 API: http://localhost:3000 (僅內部)"
    echo "  🏥 健康檢查: http://backend:3000/api/v1/health"
    echo ""
    print_info "常用指令:"
    echo "  查看日誌:   ./scripts/logs.sh [service]"
    echo "  停止服務:   ./scripts/stop-all.sh"
    echo "  重啟服務:   ./scripts/restart.sh [service]"
    echo ""
    print_info "資料庫管理:"
    echo "  Prisma Studio: docker-compose exec backend npx prisma studio"
    echo ""
    print_warning "首次啟動請確保:"
    echo "  1. 已執行資料庫 migration"
    echo "  2. 已填入 .env 中的 API keys"
    echo "  3. 智能合約已部署並填入 Package IDs"
    echo ""
    print_success "⚡ BuildKit 已啟用:"
    echo "  第一次啟動: ~2-3 分鐘 (正常)"
    echo "  第二次啟動: ~10-20 秒 (快速!)"
    echo "  只重新構建修改的層,npm 套件會被緩存"
    echo ""
}

# 主程式
main() {
    echo ""
    echo "🪙 TAXCOIN MVP - 啟動程序 (已啟用 BuildKit 快速構建)"
    echo "=========================================================="
    echo ""

    check_docker
    check_env_file

    # 初始化上傳目錄
    print_info "初始化上傳目錄..."
    ./scripts/init-uploads.sh

    cleanup_containers
    start_services
    wait_for_services
    show_info
}

main
