#!/bin/bash

# TAXCOIN MVP - 快速啟動腳本 (使用構建緩存)
# 此腳本啟用 Docker BuildKit 以加速構建

set -e

echo "🚀 快速啟動 TAXCOIN MVP (啟用構建緩存)..."
echo ""

# 檢查 Docker 是否運行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 錯誤: Docker 未運行"
    echo "請先啟動 Docker Desktop"
    exit 1
fi

# 確保在專案根目錄
cd "$(dirname "$0")/.."

# 🚀 啟用 Docker BuildKit (加速構建)
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "✅ Docker BuildKit 已啟用"
echo ""

# 檢查環境變數
if [ ! -f "backend/.env" ]; then
    echo "⚠️  警告: backend/.env 不存在"
    echo "請執行: cp backend/.env.example backend/.env"
    echo ""
fi

# 停止現有容器
echo "🛑 停止現有容器..."
docker-compose down 2>/dev/null || true
echo ""

# 🚀 使用緩存構建 (不使用 --no-cache)
echo "🔨 構建服務 (使用緩存)..."
docker-compose build
echo ""

# 啟動服務
echo "▶️  啟動服務..."
docker-compose up -d
echo ""

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 5

# 檢查服務狀態
echo ""
echo "📊 服務狀態:"
docker-compose ps
echo ""

# 檢查健康狀態
echo "🏥 檢查服務健康狀態..."
sleep 10

# 顯示後端日誌
echo ""
echo "📋 後端日誌 (最後 20 行):"
docker-compose logs --tail=20 backend
echo ""

# 顯示訪問資訊
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ TAXCOIN MVP 已啟動!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 前端: http://localhost:5004"
echo "🔧 API:  http://localhost:5004/api/v1"
echo "📊 健康檢查: http://localhost:5004/api/v1/health"
echo ""
echo "💡 提示:"
echo "  - 查看日誌: ./scripts/logs.sh"
echo "  - 停止服務: ./scripts/stop-all.sh"
echo "  - 重啟服務: ./scripts/restart.sh"
echo ""
echo "⚡ 下次啟動更快: 已使用構建緩存!"
echo ""
