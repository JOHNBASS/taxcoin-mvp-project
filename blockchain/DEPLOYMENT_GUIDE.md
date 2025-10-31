# TaxCoin 智能合約部署指南

## 🚨 當前狀況

您的測試網錢包 SUI 餘額不足以部署智能合約。

**錢包地址**: `0xf3964ed53f9052fc57c66f489f9ac80c339e456a34a25c0eba90e4e85c13ecf5`
**當前餘額**: 1.69 SUI (分散在兩個 gas coins)
**部署需求**: 約 1-2 SUI (單一 gas coin)

---

## ❓ 為什麼會 gas 不足？

### Sui 區塊鏈的 Gas Coin 限制

Sui 區塊鏈每筆交易**只能使用一個 gas coin**。您的錢包雖然總共有 1.69 SUI，但分散在兩個 coins：

```
Coin 1: 0.99 SUI  ← 最大的單一 coin，但仍不足以部署
Coin 2: 0.69 SUI
```

**為什麼不能合併？**
- 合併 coins 本身也需要 gas fee (~0.001 SUI)
- 即使合併成功也只會得到約 1.68 SUI
- 這仍然不足以支付部署的 gas fee (需要 1-2 SUI)

### 為什麼要重新部署？

您之前部署過舊版本的合約（因此有 AdminCap 等物件）。現在重新部署是為了：

1. ✅ 啟用 NFT Display 功能
2. ✅ 讓 PoolShare 和 TaxClaimNFT 在錢包中顯示動態圖片
3. ✅ 使用新的測試輔助函數

---

## 🎯 解決方案：獲取更多測試網 SUI

### 方法 1：網頁水龍頭（推薦）

**訪問**: https://faucet.sui.io/

在 Address 欄位輸入：
```
0xf3964ed53f9052fc57c66f489f9ac80c339e456a34a25c0eba90e4e85c13ecf5
```

點擊 "Request Testnet SUI Tokens"，等待約 30 秒。

### 方法 2：Discord 水龍頭

1. 加入 Sui Discord: https://discord.gg/sui
2. 前往 #testnet-faucet 頻道
3. 輸入：`!faucet 0xf3964ed53f9052fc57c66f489f9ac80c339e456a34a25c0eba90e4e85c13ecf5`

---

## 🚀 獲取 SUI 後的部署步驟

### 步驟 1：確認餘額

```bash
sui client gas
```

確保至少有一個 gas coin > 1 SUI。

### 步驟 2：部署合約

```bash
cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp/blockchain
sui client publish --gas-budget 100000000
```

### 步驟 3：記錄新的 Object IDs

部署成功後，您會看到類似以下的輸出：

```
Created Objects:
  - PackageID: 0xNEW_PACKAGE_ID
  - AdminCap objects: 0xNEW_TAXCOIN_ADMIN_CAP, ...
  - TreasuryCap: 0xNEW_TREASURY_CAP
  - Display objects: 0x...
  - UpgradeCap: 0xNEW_UPGRADE_CAP
```

請複製所有的 Object IDs。

---

## 📝 部署後需要更新的配置

### backend/.env

更新以下變數：

```bash
# Package IDs (兩個都要更新為相同的新 Package ID)
SUI_TAXCOIN_PACKAGE_ID=0xNEW_PACKAGE_ID
SUI_RWA_POOL_PACKAGE_ID=0xNEW_PACKAGE_ID

# TreasuryCap
SUI_TAXCOIN_TREASURY_CAP=0xNEW_TREASURY_CAP

# AdminCap Objects
SUI_TAXCOIN_ADMIN_CAP=0xNEW_TAXCOIN_ADMIN_CAP
SUI_NFT_ADMIN_CAP=0xNEW_NFT_ADMIN_CAP
SUI_TAX_CLAIM_ADMIN_CAP=0xNEW_TAX_CLAIM_ADMIN_CAP
SUI_RWA_TOKEN_ADMIN_CAP=0xNEW_RWA_TOKEN_ADMIN_CAP
SUI_RWA_POOL_ADMIN_CAP=0xNEW_RWA_POOL_ADMIN_CAP
SUI_EXCHANGE_ADMIN_CAP=0xNEW_EXCHANGE_ADMIN_CAP

# Pool Object
SUI_EXCHANGE_POOL=0xNEW_EXCHANGE_POOL

# UpgradeCap
SUI_UPGRADE_CAP=0xNEW_UPGRADE_CAP
```

### frontend/.env

更新 Package ID：

```bash
VITE_SUI_PACKAGE_ID=0xNEW_PACKAGE_ID
```

### 步驟 4：重啟服務

```bash
cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp
./scripts/start-all.sh
```

---

## ✅ 部署檢查清單

- [ ] 從 faucet 獲取 SUI (至少 1-2 SUI)
- [ ] 確認 `sui client gas` 顯示足夠餘額
- [ ] 執行 `sui client publish`
- [ ] 複製所有新的 Object IDs
- [ ] 更新 `backend/.env`
- [ ] 更新 `frontend/.env`
- [ ] 重啟 Docker 容器
- [ ] 測試 NFT Display 功能

---

## 🖼️ NFT 圖片已準備

以下 SVG 檔案已生成並放置在 `frontend/public/nft/`：

- ✅ `pool-share-false.svg` - 投資進行中
- ✅ `pool-share-true.svg` - 已結算
- ✅ `tax-claim-0.svg` - 待審核
- ✅ `tax-claim-1.svg` - 已核准
- ✅ `tax-claim-2.svg` - 已拒絕
- ✅ `tax-claim-3.svg` - 已發放

NFT 圖片 URL: `https://taxcoin-mvp.transferhelper.com.tw/nft/`

---

## 📞 需要協助？

如果遇到問題，請檢查：

1. Sui Explorer: https://suiscan.xyz/testnet/account/0xf3964ed53f9052fc57c66f489f9ac80c339e456a34a25c0eba90e4e85c13ecf5
2. 部署交易狀態
3. Gas coin 餘額

---

**編譯狀態**: ✅ 成功
**部署狀態**: ⏳ 等待 SUI 餘額
**NFT 圖片**: ✅ 已準備好
