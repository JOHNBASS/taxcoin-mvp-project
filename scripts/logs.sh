#!/bin/bash

# TAXCOIN MVP - 查看服務日誌
# 功能: 查看指定服務的日誌輸出

# 顏色定義
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 顯示使用說明
show_usage() {
    echo "用法: $0 [服務名稱] [選項]"
    echo ""
    echo "可用服務:"
    echo "  frontend    前端服務"
    echo "  backend     後端 API 服務"
    echo "  postgres    PostgreSQL 資料庫"
    echo "  all         所有服務 (預設)"
    echo ""
    echo "選項:"
    echo "  -f, --follow    即時追蹤日誌 (預設)"
    echo "  -n, --lines N   顯示最後 N 行 (預設 100)"
    echo "  -h, --help      顯示此幫助訊息"
    echo ""
    echo "範例:"
    echo "  $0                    # 查看所有服務日誌"
    echo "  $0 backend            # 查看後端日誌"
    echo "  $0 backend -n 50      # 查看後端最後 50 行日誌"
    echo "  $0 frontend --follow  # 即時追蹤前端日誌"
    exit 0
}

# 檢查服務是否運行
check_service() {
    local service=$1

    if ! docker-compose ps --quiet "$service" | grep -q .; then
        print_warning "服務 '$service' 未運行"
        print_info "執行 './scripts/start-all.sh' 啟動服務"
        exit 1
    fi
}

# 查看日誌
view_logs() {
    local service=${1:-""}
    local follow=true
    local lines=100

    # 解析參數
    shift || true
    while [ $# -gt 0 ]; do
        case $1 in
            -f|--follow)
                follow=true
                ;;
            -n|--lines)
                lines=$2
                shift
                ;;
            -h|--help)
                show_usage
                ;;
            *)
                print_warning "未知選項: $1"
                show_usage
                ;;
        esac
        shift || break
    done

    # 如果未指定服務,顯示所有服務
    if [ -z "$service" ] || [ "$service" = "all" ]; then
        print_info "顯示所有服務日誌 (最後 $lines 行)"
        echo ""

        if [ "$follow" = true ]; then
            docker-compose logs --tail="$lines" -f
        else
            docker-compose logs --tail="$lines"
        fi
    else
        # 檢查服務是否存在
        if ! docker-compose config --services | grep -q "^$service$"; then
            print_warning "服務 '$service' 不存在"
            echo ""
            echo "可用服務:"
            docker-compose config --services
            exit 1
        fi

        check_service "$service"

        print_info "顯示 $service 服務日誌 (最後 $lines 行)"
        echo ""

        if [ "$follow" = true ]; then
            docker-compose logs --tail="$lines" -f "$service"
        else
            docker-compose logs --tail="$lines" "$service"
        fi
    fi
}

# 主程式
main() {
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
    fi

    view_logs "$@"
}

main "$@"
