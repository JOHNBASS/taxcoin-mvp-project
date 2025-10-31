#!/bin/bash

# TAXCOIN MVP - 生產環境部署腳本
# 用途: 一鍵部署到生產環境

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數: 打印訊息
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

# 函數: 檢查必要工具
check_prerequisites() {
    print_info "檢查必要工具..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安裝"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安裝"
        exit 1
    fi

    print_success "必要工具檢查完成"
}

# 函數: 檢查環境變數文件
check_env_file() {
    print_info "檢查環境變數文件..."

    if [ ! -f .env.production ]; then
        print_error ".env.production 文件不存在"
        print_info "請複製 .env.production.example 並填入實際值"
        exit 1
    fi

    # 檢查必要環境變數
    source .env.production

    if [ -z "$POSTGRES_PASSWORD" ]; then
        print_error "POSTGRES_PASSWORD 未設定"
        exit 1
    fi

    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET 未設定"
        exit 1
    fi

    if [ -z "$REDIS_PASSWORD" ]; then
        print_error "REDIS_PASSWORD 未設定"
        exit 1
    fi

    print_success "環境變數檢查完成"
}

# 函數: 備份資料庫
backup_database() {
    print_info "備份資料庫..."

    BACKUP_DIR="./backend/prisma/backup"
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"

    mkdir -p "$BACKUP_DIR"

    if docker ps | grep -q taxcoin-postgres-prod; then
        docker exec taxcoin-postgres-prod pg_dump -U taxcoin taxcoin_prod > "$BACKUP_FILE"
        print_success "資料庫備份完成: $BACKUP_FILE"
    else
        print_warning "資料庫容器未運行,跳過備份"
    fi
}

# 函數: 拉取最新代碼
pull_latest_code() {
    print_info "拉取最新代碼..."

    if [ -d .git ]; then
        git pull origin main
        print_success "代碼更新完成"
    else
        print_warning "非 Git 倉庫,跳過代碼更新"
    fi
}

# 函數: 建置 Docker 映像
build_images() {
    print_info "建置 Docker 映像..."

    docker-compose -f docker-compose.prod.yml build --no-cache

    print_success "映像建置完成"
}

# 函數: 停止舊容器
stop_old_containers() {
    print_info "停止舊容器..."

    docker-compose -f docker-compose.prod.yml down

    print_success "舊容器已停止"
}

# 函數: 啟動新容器
start_new_containers() {
    print_info "啟動新容器..."

    docker-compose -f docker-compose.prod.yml up -d

    print_success "新容器已啟動"
}

# 函數: 執行資料庫遷移
run_migrations() {
    print_info "執行資料庫遷移..."

    # 等待資料庫啟動
    sleep 10

    docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

    print_success "資料庫遷移完成"
}

# 函數: 健康檢查
health_check() {
    print_info "執行健康檢查..."

    MAX_ATTEMPTS=30
    ATTEMPT=0

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -f http://localhost/health > /dev/null 2>&1; then
            print_success "健康檢查通過"
            return 0
        fi

        ATTEMPT=$((ATTEMPT + 1))
        print_info "等待服務啟動... ($ATTEMPT/$MAX_ATTEMPTS)"
        sleep 2
    done

    print_error "健康檢查失敗"
    return 1
}

# 函數: 清理舊映像
cleanup_old_images() {
    print_info "清理舊映像..."

    docker image prune -f

    print_success "舊映像清理完成"
}

# 函數: 顯示部署狀態
show_deployment_status() {
    print_info "部署狀態:"
    echo ""
    docker-compose -f docker-compose.prod.yml ps
    echo ""
}

# 主函數
main() {
    echo ""
    print_info "========================================"
    print_info "  TAXCOIN MVP - 生產環境部署"
    print_info "========================================"
    echo ""

    # 確認部署
    read -p "確定要部署到生產環境嗎? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_warning "部署已取消"
        exit 0
    fi

    # 執行部署步驟
    check_prerequisites
    check_env_file
    backup_database
    pull_latest_code
    build_images
    stop_old_containers
    start_new_containers
    run_migrations

    if health_check; then
        cleanup_old_images
        show_deployment_status

        echo ""
        print_success "========================================"
        print_success "  部署成功! 🎉"
        print_success "========================================"
        echo ""
        print_info "前端: http://localhost"
        print_info "API: http://localhost:8080"
        print_info "健康檢查: http://localhost/health"
        echo ""
    else
        print_error "部署失敗,請檢查日誌"
        docker-compose -f docker-compose.prod.yml logs --tail=50
        exit 1
    fi
}

# 執行主函數
main "$@"
