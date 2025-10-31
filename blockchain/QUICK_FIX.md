# 🚀 快速修復指南 - Sui Move 編譯錯誤

## ⚡ 一鍵修復 (推薦)

```bash
# 執行自動化設置腳本
./scripts/setup-sui-build.sh
```

---

## 🔧 手動修復 (3 步驟)

### 步驟 1: 升級 Git
```bash
brew upgrade git
exec $SHELL -l
git --version  # 確認 >= 2.40
```

### 步驟 2: 安裝 Sui CLI
```bash
brew install sui
sui --version
```

### 步驟 3: 編譯合約
```bash
cd blockchain
sui move build
```

---

## ✅ 驗證安裝

```bash
# 檢查工具版本
git --version    # 應該 >= 2.40.0
sui --version    # 應該顯示版本號

# 嘗試編譯
cd blockchain
sui move build

# 成功會顯示:
# INCLUDING DEPENDENCY Sui
# BUILDING taxcoin
```

---

## ❌ 如果仍然失敗

查看完整故障排除文檔:
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

或執行診斷:
```bash
# 收集診斷資訊
echo "=== Git 版本 ===" > diagnosis.log
git --version >> diagnosis.log
echo "" >> diagnosis.log

echo "=== Sui CLI 版本 ===" >> diagnosis.log
sui --version >> diagnosis.log 2>&1
echo "" >> diagnosis.log

echo "=== 編譯錯誤 ===" >> diagnosis.log
cd blockchain
sui move build 2>&1 >> ../diagnosis.log

# 查看診斷結果
cat ../diagnosis.log
```

---

**需要幫助?** 查看 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
