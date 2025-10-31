#!/bin/bash

# TAXCOIN MVP - 重啟服務
# 功能: 重啟指定服務或所有服務

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# 顯示使用說明
show_usage() {
    echo "用法: $0 [服務名稱]"
    echo ""
    echo "可用服務:"
    echo "  frontend    前端服務"
    echo "  backend     後端 API 服務"
    echo "  postgres    PostgreSQL 資料庫"
    echo "  all         所有服務 (預設)"
    echo ""
    echo "範例:"
    echo "  $0             # 重啟所有服務"
    echo "  $0 backend     # 僅重啟後端服務"
    echo "  $0 frontend    # 僅重啟前端服務"
    exit 0
}

# 重啟服務
restart_service() {
    local service=${1:-""}

    if [ -z "$service" ] || [ "$service" = "all" ]; then
        print_info "重啟所有服務..."
        docker-compose restart
        print_success "所有服務已重啟"
    else
        # 檢查服務是否存在
        if ! docker-compose config --services | grep -q "^$service$"; then
            print_warning "服務 '$service' 不存在"
            echo ""
            echo "可用服務:"
            docker-compose config --services
            exit 1
        fi

        print_info "重啟 $service 服務..."
        docker-compose restart "$service"
        print_success "$service 已重啟"
    fi
}

# 主程式
main() {
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
    fi

    echo ""
    echo "🔄 TAXCOIN MVP - 重啟程序"
    echo "========================"
    echo ""

    restart_service "$1"

    echo ""
    print_info "提示: 執行 './scripts/logs.sh $1' 查看日誌"
    echo ""
}

main "$@"
