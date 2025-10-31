#!/bin/bash

# TAXCOIN MVP - 資料庫清除腳本
# 功能: 清除所有資料庫資料並重新初始化

set -e

# Docker 命令檢測
if command -v docker &> /dev/null; then
    DOCKER_CMD="docker"
    DOCKER_COMPOSE_CMD="docker compose"
elif [ -f "/Applications/Docker.app/Contents/Resources/bin/docker" ]; then
    DOCKER_CMD="/Applications/Docker.app/Contents/Resources/bin/docker"
    DOCKER_COMPOSE_CMD="/Applications/Docker.app/Contents/Resources/bin/docker compose"
else
    echo "❌ 找不到 Docker 命令"
    exit 1
fi

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

# 顯示警告並確認
confirm_clear() {
    echo ""
    echo "🗑️  TAXCOIN MVP - 資料庫清除"
    echo "============================"
    echo ""
    print_warning "⚠️  此操作將清除所有資料庫數據！"
    echo ""
    echo "將會刪除以下內容:"
    echo "  • 所有用戶資料"
    echo "  • 所有投資池"
    echo "  • 所有投資記錄"
    echo "  • 所有稅務申請"
    echo "  • 所有通知"
    echo "  • 所有 NFT 記錄"
    echo ""

    # 如果有 --force 參數則跳過確認
    if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
        print_warning "使用 --force 參數，跳過確認"
        return 0
    fi

    read -p "$(echo -e ${RED}確定要繼續嗎? [yes/NO]: ${NC})" -r
    echo
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "已取消操作"
        exit 0
    fi
}

# 檢查容器狀態
check_containers() {
    print_info "檢查容器狀態..."

    if ! $DOCKER_CMD ps | grep -q "taxcoin-mongodb"; then
        print_error "MongoDB 容器未運行"
        print_info "請先執行: ./scripts/start-all.sh"
        exit 1
    fi

    if ! $DOCKER_CMD ps | grep -q "taxcoin-backend"; then
        print_error "後端容器未運行"
        print_info "請先執行: ./scripts/start-all.sh"
        exit 1
    fi

    print_success "容器檢查通過"
}

# 方法 1: 使用 Prisma migrate reset (❌ 不支援 MongoDB)
clear_with_prisma() {
    print_error "Prisma migrate reset 不支援 MongoDB！"
    print_info "請使用 --mongo 或 --rebuild 方法"
    echo ""
    print_info "建議執行:"
    echo "  $0 --mongo --force"
    echo ""
    exit 1
}

# 方法 2: 直接清除 MongoDB 所有 collections
clear_with_mongo() {
    print_info "直接清除 MongoDB 所有 collections..."

    # 獲取所有 collection 名稱並刪除
    $DOCKER_CMD exec taxcoin-mongodb mongosh taxcoin --quiet --eval "
        db.getCollectionNames().forEach(function(collName) {
            if (collName !== 'system.indexes') {
                print('刪除 collection: ' + collName);
                db[collName].drop();
            }
        });
        print('✅ 所有 collections 已刪除');
    "

    print_success "MongoDB 清除完成"
}

# 方法 3: 完全刪除並重建資料庫
clear_with_rebuild() {
    print_info "停止並刪除 MongoDB 容器..."
    $DOCKER_COMPOSE_CMD stop mongodb
    $DOCKER_COMPOSE_CMD rm -f mongodb

    print_info "刪除 MongoDB 資料卷..."
    $DOCKER_CMD volume rm taxcoin-postgres-data 2>/dev/null || true
    $DOCKER_CMD volume rm taxcoin-mvp_mongodb-data 2>/dev/null || true

    print_info "重新啟動 MongoDB..."
    $DOCKER_COMPOSE_CMD up -d mongodb

    print_info "等待 MongoDB 啟動..."
    sleep 5

    print_success "MongoDB 容器重建完成"
}

# 重新初始化資料庫
reinitialize_database() {
    if [ "$1" != "--skip-init" ]; then
        # MongoDB 不需要 migrations，只需要重新生成 Prisma Client
        print_info "重新生成 Prisma Client..."
        $DOCKER_CMD exec taxcoin-backend npx prisma generate

        # 推送 schema 到 MongoDB (確保索引和結構同步)
        print_info "同步 Prisma schema 到 MongoDB..."
        $DOCKER_CMD exec taxcoin-backend npx prisma db push --skip-generate

        if [ "$2" = "--with-seed" ] || [ "$2" = "-s" ]; then
            print_info "填入種子資料..."
            $DOCKER_CMD exec taxcoin-backend npm run prisma:seed
            print_success "種子資料填入完成"
        fi

        print_success "資料庫重新初始化完成"
    fi
}

# 顯示使用說明
show_usage() {
    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "用法: $0 [方法] [選項]"
        echo ""
        echo "方法:"
        echo "  --mongo      直接清除 MongoDB collections (推薦，快速)"
        echo "  --rebuild    完全重建 MongoDB 容器和資料卷 (徹底，較慢)"
        echo "  --prisma     使用 Prisma migrate reset (❌ 不支援 MongoDB)"
        echo "  (無)         預設使用 --mongo 方法"
        echo ""
        echo "選項:"
        echo "  -f, --force       跳過確認直接執行"
        echo "  -s, --with-seed   清除後重新填入種子資料"
        echo "  --skip-init       不重新初始化資料庫 (僅清除)"
        echo "  -h, --help        顯示此幫助訊息"
        echo ""
        echo "範例:"
        echo "  $0                      # 使用 Prisma 重置 (需確認)"
        echo "  $0 --force              # 直接清除，不需確認"
        echo "  $0 --with-seed          # 清除後重新填入測試資料"
        echo "  $0 --mongo --force      # 使用 MongoDB 方法快速清除"
        echo "  $0 --rebuild --force    # 完全重建資料庫容器"
        echo ""
        exit 0
    fi
}

# 主程式
main() {
    show_usage "$@"

    # 解析參數
    METHOD="mongo"  # 預設使用 mongo 方法（MongoDB 不支援 Prisma migrate reset）
    FORCE=""
    SEED=""
    SKIP_INIT=""

    for arg in "$@"; do
        case $arg in
            --prisma) METHOD="prisma" ;;
            --mongo) METHOD="mongo" ;;
            --rebuild) METHOD="rebuild" ;;
            -f|--force) FORCE="--force" ;;
            -s|--with-seed) SEED="--with-seed" ;;
            --skip-init) SKIP_INIT="--skip-init" ;;
        esac
    done

    confirm_clear "$FORCE"
    check_containers

    echo ""
    print_info "使用方法: $METHOD"
    echo ""

    # 執行清除
    case $METHOD in
        prisma)
            clear_with_prisma
            ;;
        mongo)
            clear_with_mongo
            reinitialize_database "$SKIP_INIT" "$SEED"
            ;;
        rebuild)
            clear_with_rebuild
            reinitialize_database "$SKIP_INIT" "$SEED"
            ;;
    esac

    echo ""
    print_success "🎉 資料庫清除完成！"
    echo ""

    if [ "$SEED" = "--with-seed" ]; then
        print_info "測試帳號已重新創建:"
        echo "  👨‍💼 管理員: admin@taxcoin.tw"
        echo "  🧳 旅客1: tourist1@example.com"
        echo "  🧳 旅客2: tourist2@example.com"
        echo "  💼 投資者1: investor1@example.com"
        echo ""
    fi

    print_info "提示: 如需填入測試資料，請執行:"
    echo "  ./scripts/db-setup.sh"
    echo ""
}

main "$@"
