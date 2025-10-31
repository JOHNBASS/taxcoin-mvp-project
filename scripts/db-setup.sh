#!/bin/bash

# TAXCOIN MVP - 資料庫初始化腳本
# 功能: 執行 Prisma migrations 和種子資料

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 檢查容器狀態
check_backend() {
    if ! docker-compose ps backend | grep -q "Up"; then
        print_error "後端容器未運行"
        print_info "請先執行: ./scripts/start-all.sh"
        exit 1
    fi
    print_success "後端容器檢查通過"
}

# 生成 Prisma Client
generate_client() {
    print_info "生成 Prisma Client..."
    docker-compose exec backend npx prisma generate
    print_success "Prisma Client 生成完成"
}

# 執行 migrations
run_migrations() {
    print_info "執行資料庫 migrations..."
    docker-compose exec backend npx prisma migrate deploy
    print_success "Migrations 執行完成"
}

# 執行種子資料
run_seed() {
    print_info "填入種子資料..."
    docker-compose exec backend npm run prisma:seed
    print_success "種子資料填入完成"
}

# Prisma Studio (可選)
open_studio() {
    if [ "$1" = "--studio" ] || [ "$1" = "-s" ]; then
        print_info "啟動 Prisma Studio..."
        print_warning "按 Ctrl+C 停止 Studio"
        docker-compose exec backend npx prisma studio
    fi
}

# 顯示使用說明
show_usage() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "用法: $0 [選項]"
        echo ""
        echo "選項:"
        echo "  (無)        執行 migrations 和種子資料"
        echo "  -s, --studio  執行完成後開啟 Prisma Studio"
        echo "  -h, --help    顯示此幫助訊息"
        echo ""
        echo "範例:"
        echo "  $0              # 初始化資料庫"
        echo "  $0 --studio     # 初始化並開啟 Studio"
        exit 0
    fi
}

# 主程式
main() {
    echo ""
    echo "🗄️  TAXCOIN MVP - 資料庫設置"
    echo "============================"
    echo ""

    show_usage "$1"
    check_backend
    generate_client
    run_migrations
    run_seed

    echo ""
    print_success "資料庫設置完成!"
    echo ""
    print_info "測試帳號已創建:"
    echo "  👨‍💼 管理員: admin@taxcoin.tw"
    echo "  🧳 旅客1: tourist1@example.com (已驗證)"
    echo "  🧳 旅客2: tourist2@example.com (待驗證)"
    echo "  💼 投資者1: investor1@example.com (已驗證)"
    echo ""
    print_info "查看資料庫: docker-compose exec backend npx prisma studio"
    echo ""

    open_studio "$1"
}

main "$@"
