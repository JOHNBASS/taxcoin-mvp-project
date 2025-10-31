#!/bin/bash

###########################################
# Homebrew 和 Git 修復腳本
# 用途: 修復 Homebrew tap 問題並升級 Git
###########################################

set -e  # 遇到錯誤立即退出

echo "╔══════════════════════════════════════════════════════════╗"
echo "║         Homebrew 和 Git 修復腳本                        ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 步驟 1: 清理損壞的 Homebrew taps
echo -e "${BLUE}[1/5] 清理 Homebrew taps...${NC}"

echo -e "${YELLOW}移除損壞的 taps...${NC}"
brew untap heroku/brew 2>/dev/null || echo "heroku/brew tap 不存在,跳過"
brew untap homebrew/homebrew-cask-versions 2>/dev/null || echo "homebrew-cask-versions tap 不存在,跳過"

echo -e "${GREEN}✅ Taps 清理完成${NC}"
echo ""

# 步驟 2: 診斷並修復 Homebrew
echo -e "${BLUE}[2/5] 診斷 Homebrew...${NC}"

# 檢查 Homebrew 健康狀態
echo -e "${YELLOW}執行 brew doctor...${NC}"
brew doctor || {
    echo -e "${YELLOW}⚠️  發現問題,嘗試自動修復...${NC}"

    # 修復常見問題
    echo "修復權限..."
    sudo chown -R $(whoami) /usr/local/var/homebrew 2>/dev/null || true
    sudo chown -R $(whoami) /usr/local/Homebrew 2>/dev/null || true

    echo "重置 Homebrew repository..."
    cd /usr/local/Homebrew
    git reset --hard origin/master 2>/dev/null || {
        echo -e "${RED}無法重置 Homebrew repository${NC}"
        echo -e "${YELLOW}建議重新安裝 Homebrew:${NC}"
        echo -e "  ${BLUE}/bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"${NC}"
    }
}

echo -e "${GREEN}✅ Homebrew 診斷完成${NC}"
echo ""

# 步驟 3: 更新 Homebrew
echo -e "${BLUE}[3/5] 更新 Homebrew...${NC}"

# 設置環境變數避免互動式提示
export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

# 嘗試更新,如果失敗則跳過
brew update 2>&1 | grep -v "fatal:" || {
    echo -e "${YELLOW}⚠️  Homebrew 更新失敗,繼續下一步...${NC}"
}

echo -e "${GREEN}✅ Homebrew 更新完成${NC}"
echo ""

# 步驟 4: 升級 Git
echo -e "${BLUE}[4/5] 升級 Git...${NC}"

CURRENT_GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
echo "當前 Git 版本: $CURRENT_GIT_VERSION"

if command -v git &> /dev/null; then
    echo -e "${YELLOW}正在升級 Git...${NC}"

    # 嘗試升級
    brew upgrade git 2>&1 || brew install git 2>&1 || {
        echo -e "${RED}❌ 透過 Homebrew 安裝 Git 失敗${NC}"
        echo ""
        echo -e "${YELLOW}替代方案:${NC}"
        echo "1. 從 Xcode Command Line Tools 安裝:"
        echo "   xcode-select --install"
        echo ""
        echo "2. 從官網下載安裝器:"
        echo "   https://git-scm.com/download/mac"
        echo ""
        echo "3. 使用另一個套件管理器 (MacPorts):"
        echo "   sudo port install git"
        exit 1
    }
else
    echo -e "${YELLOW}Git 未安裝,正在安裝...${NC}"
    brew install git
fi

# 重新載入 PATH
export PATH="/usr/local/bin:$PATH"

# 驗證新版本
if command -v git &> /dev/null; then
    NEW_GIT_VERSION=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    echo ""
    echo -e "${GREEN}✅ Git 升級成功!${NC}"
    echo -e "舊版本: $CURRENT_GIT_VERSION"
    echo -e "新版本: $NEW_GIT_VERSION"

    # 檢查版本是否符合要求
    IFS='.' read -ra VERSION <<< "$NEW_GIT_VERSION"
    MAJOR=${VERSION[0]}
    MINOR=${VERSION[1]}

    if [ "$MAJOR" -lt 2 ] || ([ "$MAJOR" -eq 2 ] && [ "$MINOR" -lt 27 ]); then
        echo -e "${YELLOW}⚠️  警告: Git 版本仍低於 2.27,建議手動升級${NC}"
    fi
else
    echo -e "${RED}❌ Git 安裝失敗${NC}"
    exit 1
fi
echo ""

# 步驟 5: 安裝 Sui CLI
echo -e "${BLUE}[5/5] 安裝 Sui CLI...${NC}"

if command -v sui &> /dev/null; then
    CURRENT_SUI_VERSION=$(sui --version 2>&1 || echo "unknown")
    echo "當前 Sui CLI 版本: $CURRENT_SUI_VERSION"
    echo -e "${YELLOW}正在更新 Sui CLI...${NC}"
    brew upgrade sui 2>&1 || echo "已是最新版本"
else
    echo -e "${YELLOW}Sui CLI 未安裝,正在安裝...${NC}"
    brew install sui 2>&1 || {
        echo -e "${RED}❌ 透過 Homebrew 安裝 Sui CLI 失敗${NC}"
        echo ""
        echo -e "${YELLOW}替代方案 - 使用 Cargo 安裝:${NC}"
        echo "1. 安裝 Rust (如果尚未安裝):"
        echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        echo ""
        echo "2. 安裝 Sui CLI:"
        echo "   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui"
        exit 1
    }
fi

# 驗證 Sui CLI
if command -v sui &> /dev/null; then
    echo -e "${GREEN}✅ Sui CLI 安裝成功!${NC}"
    sui --version
else
    echo -e "${RED}❌ Sui CLI 安裝失敗${NC}"
    exit 1
fi
echo ""

# 完成
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ 修復完成!                                           ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}重要提示:${NC}"
echo "1. 請重新載入 shell 以使用新版 Git:"
echo -e "   ${YELLOW}exec \$SHELL -l${NC}"
echo ""
echo "2. 驗證工具版本:"
echo "   git --version    (應該 >= 2.40)"
echo "   sui --version"
echo ""
echo "3. 接下來編譯 Sui Move 合約:"
echo "   cd blockchain"
echo "   sui move build"
echo ""

# 提示需要重新載入 shell
echo -e "${YELLOW}⚠️  請執行以下命令重新載入 shell:${NC}"
echo -e "${BLUE}exec \$SHELL -l${NC}"
echo ""
