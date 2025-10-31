#!/bin/bash

# TAXCOIN MVP - 停止所有服務
# 功能: 優雅地停止所有 Docker 容器

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 停止服務
stop_services() {
    print_info "正在停止 TAXCOIN MVP 服務..."

    if docker-compose ps --quiet | grep -q .; then
        docker-compose stop
        print_success "所有服務已停止"
    else
        print_warning "沒有運行中的服務"
    fi
}

# 選項: 完全移除容器和網路
remove_containers() {
    if [ "$1" = "--remove" ] || [ "$1" = "-r" ]; then
        print_warning "正在移除容器和網路..."
        docker-compose down --remove-orphans
        print_success "容器和網路已移除"
        echo ""
        print_info "資料庫數據已保留在 volume 中"
        print_info "如需完全清理,請執行: docker-compose down -v"
    fi
}

# 顯示使用說明
show_usage() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "用法: $0 [選項]"
        echo ""
        echo "選項:"
        echo "  (無)        僅停止服務,保留容器"
        echo "  -r, --remove  停止並移除容器和網路"
        echo "  -h, --help    顯示此幫助訊息"
        echo ""
        echo "範例:"
        echo "  $0              # 停止服務"
        echo "  $0 --remove     # 停止並移除容器"
        exit 0
    fi
}

# 主程式
main() {
    echo ""
    echo "🛑 TAXCOIN MVP - 停止程序"
    echo "========================"
    echo ""

    show_usage "$1"
    stop_services
    remove_containers "$1"

    echo ""
    print_info "提示: 執行 './scripts/start-all.sh' 重新啟動服務"
    echo ""
}

main "$@"
