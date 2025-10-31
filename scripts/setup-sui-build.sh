#!/bin/bash

###########################################
# Sui Move 智能合約編譯環境設置腳本
# 用途: 修復 Git 版本問題並安裝 Sui CLI
###########################################

set -e  # 遇到錯誤立即退出

echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Sui Move 智能合約編譯環境設置                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 Homebrew
echo -e "${BLUE}[1/4] 檢查 Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew 未安裝${NC}"
    echo -e "${YELLOW}請先安裝 Homebrew: https://brew.sh/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Homebrew 已安裝${NC}"
echo ""

# 檢查並升級 Git
echo -e "${BLUE}[2/4] 檢查 Git 版本...${NC}"
CURRENT_GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "當前 Git 版本: $CURRENT_GIT_VERSION"

# 解析版本號
IFS='.' read -ra VERSION <<< "$CURRENT_GIT_VERSION"
MAJOR=${VERSION[0]}
MINOR=${VERSION[1]}

# Git 2.27+ 支援 --filter=tree:0,但建議 2.40+
if [ "$MAJOR" -lt 2 ] || ([ "$MAJOR" -eq 2 ] && [ "$MINOR" -lt 40 ]); then
    echo -e "${YELLOW}⚠️  建議升級 Git 到 2.40+${NC}"
    echo -e "${BLUE}正在升級 Git...${NC}"

    brew update
    brew upgrade git || brew install git

    echo -e "${GREEN}✅ Git 已升級${NC}"
    echo -e "${YELLOW}⚠️  請重新載入 shell:${NC}"
    echo -e "   ${BLUE}exec \$SHELL -l${NC}"
else
    echo -e "${GREEN}✅ Git 版本符合要求${NC}"
fi
echo ""

# 安裝 Sui CLI
echo -e "${BLUE}[3/4] 安裝 Sui CLI...${NC}"
if command -v sui &> /dev/null; then
    CURRENT_SUI_VERSION=$(sui --version 2>&1 || echo "unknown")
    echo "當前 Sui CLI 版本: $CURRENT_SUI_VERSION"
    echo -e "${YELLOW}正在更新 Sui CLI...${NC}"
    brew upgrade sui || echo "已是最新版本"
else
    echo -e "${YELLOW}Sui CLI 未安裝,正在安裝...${NC}"
    brew install sui
fi

# 驗證安裝
if command -v sui &> /dev/null; then
    echo -e "${GREEN}✅ Sui CLI 安裝成功${NC}"
    sui --version
else
    echo -e "${RED}❌ Sui CLI 安裝失敗${NC}"
    echo -e "${YELLOW}請手動安裝:${NC}"
    echo -e "   ${BLUE}cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui${NC}"
    exit 1
fi
echo ""

# 嘗試編譯 Move 合約
echo -e "${BLUE}[4/4] 嘗試編譯 Sui Move 智能合約...${NC}"
cd "$(dirname "$0")/../blockchain"

if [ -f "Move.toml" ]; then
    echo -e "${BLUE}正在編譯...${NC}"

    if sui move build; then
        echo -e "${GREEN}✅ 智能合約編譯成功!${NC}"
        echo ""
        echo -e "${GREEN}編譯產出:${NC}"
        ls -lh build/
    else
        echo -e "${RED}❌ 編譯失敗${NC}"
        echo ""
        echo -e "${YELLOW}常見問題排查:${NC}"
        echo "1. 確保 Git 版本 >= 2.40"
        echo "2. 確保 Sui CLI 已正確安裝"
        echo "3. 檢查網路連線 (需要下載依賴)"
        echo "4. 檢查 Move.toml 配置"
        echo ""
        echo -e "${BLUE}手動編譯指令:${NC}"
        echo "   cd blockchain"
        echo "   sui move build"
        exit 1
    fi
else
    echo -e "${RED}❌ 找不到 Move.toml${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Sui Move 編譯環境設置完成!                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}下一步:${NC}"
echo "1. 部署智能合約到 Sui Testnet"
echo "2. 將 Package ID 更新到 .env 檔案"
echo "3. 測試合約功能"
echo ""
echo -e "${BLUE}相關指令:${NC}"
echo "  sui move build           # 編譯合約"
echo "  sui move test            # 執行測試"
echo "  sui client publish       # 部署到測試網"
echo ""
