# Sui Move 編譯問題排除指南

## 🔴 問題 1: `git clone` 錯誤 `unknown option 'filter=tree:0'`

### 症狀
```
error: unknown option `filter=tree:0'
Failed to build Move modules: Failed to resolve dependencies
```

### 原因
Git 版本太舊,不支援 `--filter=tree:0` 選項。Sui CLI 使用此功能來優化依賴下載。

### 解決方案

#### 方案 A: 升級 Git (推薦)

```bash
# 1. 更新 Homebrew
brew update

# 2. 升級 Git
brew upgrade git

# 3. 重新載入 shell
exec $SHELL -l

# 4. 驗證版本 (應該 >= 2.40)
git --version
```

#### 方案 B: 使用自動化腳本

```bash
# 執行我們提供的設置腳本
./scripts/setup-sui-build.sh
```

#### 方案 C: 修改 Move.toml (臨時解決)

編輯 `blockchain/Move.toml`,將 `rev` 改為具體的 commit hash:

```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "testnet" }
```

---

## 🔴 問題 2: Sui CLI 未安裝

### 症狀
```
command not found: sui
```

### 解決方案

#### 方法 1: Homebrew (macOS - 推薦)

```bash
brew install sui
```

#### 方法 2: Cargo (需要 Rust)

```bash
# 安裝 Rust (如果還沒有)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 安裝 Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

#### 方法 3: 二進制文件下載

訪問 [Sui Releases](https://github.com/MystenLabs/sui/releases) 下載適合你系統的版本。

---

## 🔴 問題 3: 依賴下載失敗

### 症狀
```
FETCHING GIT DEPENDENCY https://github.com/MystenLabs/sui.git
Failed to resolve dependencies
```

### 可能原因
1. 網路連線問題
2. GitHub 存取受限
3. Git 配置問題

### 解決方案

#### 檢查網路連線
```bash
# 測試 GitHub 連線
curl -I https://github.com

# 測試 Git clone
git clone --depth 1 https://github.com/MystenLabs/sui.git /tmp/sui-test
rm -rf /tmp/sui-test
```

#### 配置 Git 使用 SSH 而非 HTTPS
```bash
# 如果你有 GitHub SSH key
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

#### 使用代理 (如果在中國大陸)
```bash
# 設置 Git 代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

---

## 🔴 問題 4: Move 語法錯誤

### 症狀
```
error[E01002]: unexpected token
```

### 檢查清單
1. ✅ 確認使用正確的 Move edition: `2024.beta`
2. ✅ 檢查語法是否符合 Sui Move 規範
3. ✅ 確認所有依賴正確引入

### 驗證語法
```bash
# 進入 blockchain 目錄
cd blockchain

# 檢查語法
sui move build --skip-fetch-latest-git-deps
```

---

## 🔴 問題 5: 權限問題

### 症狀
```
Permission denied
```

### 解決方案
```bash
# 確保腳本有執行權限
chmod +x scripts/*.sh

# 確保當前用戶對目錄有寫入權限
ls -la blockchain/
```

---

## 🟡 最佳實踐

### 1. 保持工具最新
```bash
# 更新 Homebrew 套件
brew update && brew upgrade

# 更新 Sui CLI
sui client update
```

### 2. 清理舊的編譯產出
```bash
cd blockchain
rm -rf build/
sui move build
```

### 3. 使用正確的網路配置
```bash
# 查看當前網路
sui client active-env

# 切換到測試網
sui client switch --env testnet
```

### 4. 檢查錢包設置
```bash
# 查看當前地址
sui client active-address

# 取得測試幣
sui client faucet
```

---

## 📚 相關資源

- **Sui 官方文件**: https://docs.sui.io/
- **Move 語言手冊**: https://move-language.github.io/move/
- **Sui Move 範例**: https://github.com/MystenLabs/sui/tree/main/examples
- **問題追蹤**: https://github.com/MystenLabs/sui/issues

---

## 🆘 仍然無法解決?

### 收集除錯資訊
```bash
# 系統資訊
uname -a

# Git 版本
git --version

# Sui 版本
sui --version

# 錯誤日誌
sui move build 2>&1 | tee build-error.log
```

### 檢查詳細日誌
```bash
# 啟用詳細輸出
RUST_LOG=debug sui move build
```

### 聯繫支援
- Sui Discord: https://discord.gg/sui
- 專案 Issue: 在本專案提交 Issue 並附上 `build-error.log`

---

**最後更新**: 2025-10-20
