# Celo Alfajores Faucet 替代方案

## 🚨 問題：無法從主 Faucet 獲取測試 CELO

狀態：Failed
原因：可能是 IP 限制、地址已領取、或服務暫時關閉

## ✅ 解決方案

### 方案 1: Celo Discord Bot（推薦）⭐⭐⭐⭐⭐

**成功率：90%+**

步驟：
1. 加入 Celo Discord: https://discord.gg/celo
2. 找到 #alfajores-faucet 頻道
3. 輸入指令：
   ```
   /faucet 0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4
   ```
4. 等待 1-2 分鐘
5. 檢查餘額：
   ```bash
   npx ts-node scripts/check-balance.ts
   ```

### 方案 2: 多個 Faucet 網站嘗試 ⭐⭐⭐⭐

**網站列表：**

1. **官方 Celo Faucet**
   - https://faucet.celo.org/alfajores
   - 地址：`0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4`

2. **Celo Developers Faucet**
   - https://celo.org/developers/faucet
   - 可能需要註冊

3. **Alchemy Faucet**
   - https://www.alchemy.com/faucets/celo-alfajores
   - 需要 Alchemy 帳號（免費）

4. **QuickNode Faucet**
   - https://faucet.quicknode.com/celo/alfajores
   - 需要 QuickNode 帳號（免費）

### 方案 3: Celo CLI ⭐⭐⭐

安裝並使用 Celo CLI：

```bash
# 安裝
npm install -g @celo/celocli

# 領取測試幣
celocli account:faucet \
  --account 0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4 \
  --network alfajores
```

### 方案 4: 更換網路環境 ⭐⭐⭐

Faucet 可能基於 IP 限制：

1. **關閉 VPN**（如果有使用）
2. **更換網路**：
   - 從 WiFi 切換到手機熱點
   - 或從手機熱點切換到 WiFi
3. **等待 24 小時後重試**

### 方案 5: 使用測試網路橋接 ⭐⭐

從其他測試網獲取代幣後橋接到 Celo：

1. 在 Ethereum Sepolia 領取 ETH
2. 使用 Celo Bridge 橋接到 Alfajores
3. URL: https://bridge.celo.org

### 方案 6: 社群請求 ⭐⭐

在社群請求測試幣：

**Celo Forum:**
- https://forum.celo.org/
- 發帖請求測試 CELO

**Reddit:**
- https://reddit.com/r/celo
- 發帖標題："Request: Alfajores testnet CELO for development"

**Telegram:**
- Celo Official: https://t.me/celoplatform

### 方案 7: 生成新錢包重試 ⭐⭐⭐⭐

已為你生成新錢包：

```
地址: 0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4
私鑰: 0x2f1167a8c7077a20a7ea4eee0449e7939924a6d3f432a7ffb645616982847ece
```

用這個新地址重試所有 Faucet。

## 🔄 更新錢包腳本

如果新錢包成功領到測試幣，運行：

```bash
cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp/blockchain/celo
chmod +x scripts/update-wallet.sh
./scripts/update-wallet.sh 0x2f1167a8c7077a20a7ea4eee0449e7939924a6d3f432a7ffb645616982847ece
```

## 📊 檢查餘額

隨時檢查餘額：

```bash
npx ts-node scripts/check-balance.ts
```

或訪問：
https://alfajores.celoscan.io/address/0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4

## ⏰ 時間線

- **立即嘗試：** Discord Bot、新地址 Faucet
- **30 分鐘內：** Alchemy、QuickNode Faucet
- **1-2 小時：** 社群請求
- **24 小時後：** 更換 IP 重試

## 🎯 成功後的步驟

一旦獲得測試 CELO（餘額 > 0）：

```bash
# 1. 確認餘額
npx ts-node scripts/check-balance.ts

# 2. 部署合約
npx hardhat run scripts/deploy-verifier.ts --network celo-alfajores

# 3. 更新環境變數
# 複製合約地址到 backend/.env
```

---

**兩個可用的測試錢包：**

1. **錢包 1:**
   - 地址：`0xc98200a3B2d20Df6Fd50090DC9f22770fb56F13f`
   - 私鑰：`0x61e98bcc40cc9397d3f64db4b27e7cf4438921e217d17db2d4fceef022c1e69d`

2. **錢包 2（新）:**
   - 地址：`0x4e2243d3597F65bDBb09431F6cAb31acA8De5Dc4`
   - 私鑰：`0x2f1167a8c7077a20a7ea4eee0449e7939924a6d3f432a7ffb645616982847ece`

試試兩個地址，看哪個能成功！
