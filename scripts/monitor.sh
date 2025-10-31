#!/bin/bash

# TAXCOIN MVP - 系統監控腳本
# 用途: 監控容器狀態、資源使用和日誌

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# 顯示容器狀態
show_container_status() {
    print_header "容器狀態"
    docker-compose -f docker-compose.prod.yml ps
    echo ""
}

# 顯示資源使用
show_resource_usage() {
    print_header "資源使用"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
}

# 顯示健康檢查
show_health_checks() {
    print_header "健康檢查"

    # 後端健康檢查
    echo -n "後端 API: "
    if curl -sf http://localhost:8080/health > /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 異常${NC}"
    fi

    # 前端健康檢查
    echo -n "前端應用: "
    if curl -sf http://localhost/health > /dev/null; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 異常${NC}"
    fi

    # 資料庫檢查
    echo -n "PostgreSQL: "
    if docker exec taxcoin-postgres-prod pg_isready -U taxcoin > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 異常${NC}"
    fi

    # Redis 檢查
    echo -n "Redis: "
    if docker exec taxcoin-redis-prod redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 健康${NC}"
    else
        echo -e "${RED}❌ 異常${NC}"
    fi

    echo ""
}

# 顯示最近日誌
show_recent_logs() {
    print_header "最近日誌 (後端)"
    docker-compose -f docker-compose.prod.yml logs --tail=20 backend
    echo ""
}

# 顯示錯誤日誌
show_error_logs() {
    print_header "錯誤日誌"
    docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error || echo "無錯誤日誌"
    echo ""
}

# 持續監控模式
continuous_monitor() {
    while true; do
        clear
        echo -e "${GREEN}TAXCOIN MVP - 即時監控${NC}"
        echo "按 Ctrl+C 退出"
        echo ""
        show_container_status
        show_resource_usage
        show_health_checks
        sleep 5
    done
}

# 主選單
show_menu() {
    echo ""
    echo "TAXCOIN MVP - 系統監控"
    echo ""
    echo "1) 容器狀態"
    echo "2) 資源使用"
    echo "3) 健康檢查"
    echo "4) 最近日誌"
    echo "5) 錯誤日誌"
    echo "6) 完整報告"
    echo "7) 持續監控"
    echo "0) 退出"
    echo ""
    read -p "請選擇 (0-7): " CHOICE

    case $CHOICE in
        1) show_container_status ;;
        2) show_resource_usage ;;
        3) show_health_checks ;;
        4) show_recent_logs ;;
        5) show_error_logs ;;
        6)
            show_container_status
            show_resource_usage
            show_health_checks
            show_recent_logs
            ;;
        7) continuous_monitor ;;
        0) exit 0 ;;
        *) echo "無效選擇" ;;
    esac

    read -p "按 Enter 繼續..."
}

# 主循環
if [ "$1" == "--watch" ]; then
    continuous_monitor
else
    while true; do
        show_menu
    done
fi
