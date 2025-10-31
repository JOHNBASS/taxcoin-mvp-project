#!/bin/bash

# TAXCOIN MVP - 回滾腳本
# 用途: 快速回滾到上一個穩定版本

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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 主函數
main() {
    echo ""
    print_warning "========================================"
    print_warning "  TAXCOIN MVP - 回滾部署"
    print_warning "========================================"
    echo ""

    # 確認回滾
    read -p "確定要回滾到上一個版本嗎? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_info "回滾已取消"
        exit 0
    fi

    print_info "停止當前容器..."
    docker-compose -f docker-compose.prod.yml down

    print_info "回滾 Git 代碼..."
    if [ -d .git ]; then
        git reset --hard HEAD~1
        print_success "代碼已回滾"
    else
        print_warning "非 Git 倉庫,跳過代碼回滾"
    fi

    print_info "恢復資料庫備份..."
    BACKUP_DIR="./backend/prisma/backup"
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | head -1)

    if [ -n "$LATEST_BACKUP" ]; then
        print_info "找到備份: $LATEST_BACKUP"
        read -p "確定要恢復此備份嗎? (yes/no): " RESTORE_CONFIRM
        if [ "$RESTORE_CONFIRM" == "yes" ]; then
            docker-compose -f docker-compose.prod.yml up -d postgres
            sleep 5
            cat "$LATEST_BACKUP" | docker exec -i taxcoin-postgres-prod psql -U taxcoin taxcoin_prod
            print_success "資料庫已恢復"
        fi
    else
        print_warning "未找到資料庫備份"
    fi

    print_info "重新啟動服務..."
    docker-compose -f docker-compose.prod.yml up -d

    print_success "回滾完成"
    docker-compose -f docker-compose.prod.yml ps
}

main "$@"
