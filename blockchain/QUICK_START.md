# Sui 智能合約快速開始

> 5 分鐘部署 TAXCOIN 智能合約到 Sui Testnet

---

## ⚡ 快速開始

### 第一步: 安裝 Sui CLI

**macOS**:
```bash
brew install sui
```

**Linux**:
```bash
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**驗證安裝**:
```bash
sui --version
# 應顯示: sui 1.x.x
```

---

### 第二步: 配置錢包

```bash
# 1. 創建新地址
sui client new-address ed25519

# 2. 切換到 testnet
sui client switch --env testnet

# 3. 查看當前地址
sui client active-address
# 複製這個地址,等下需要用

# 4. 獲取測試代幣 (用於 gas)
sui client faucet

# 5. 確認餘額
sui client gas
# 應該看到至少 1 SUI
```

---

### 第三步: 部署合約

```bash
# 1. 進入 blockchain 目錄
cd blockchain

# 2. 構建合約
sui move build

# 3. 執行測試 (可選)
sui move test

# 4. 部署到 Testnet
./scripts/deploy.sh
```

**重要**: 部署成功後,會顯示以下資訊,**請務必保存**:

```
Created Objects:
  - Package ID: 0xabc123...
  - TreasuryCap<TAXCOIN>: 0xdef456...
  - AdminCap (taxcoin): 0xghi789...
  - AdminCap (tax_claim_nft): 0xjkl012...
  - AdminCap (rwa_token): 0xmno345...
  - AdminCap (rwa_pool): 0xpqr678...
```

---

### 第四步: 配置後端

在 `backend/.env` 添加:

```env
# Sui 配置
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# 管理員私鑰 (從步驟二獲取)
SUI_ADMIN_PRIVATE_KEY=你的私鑰(hex格式)

# 合約地址 (從步驟三獲取)
SUI_PACKAGE_ID=0xabc123...
SUI_TAXCOIN_TREASURY_CAP=0xdef456...
SUI_TAXCOIN_ADMIN_CAP=0xghi789...
SUI_TAX_CLAIM_ADMIN_CAP=0xjkl012...
SUI_RWA_TOKEN_ADMIN_CAP=0xmno345...
SUI_RWA_POOL_ADMIN_CAP=0xpqr678...
```

**如何獲取私鑰?**

```bash
# 導出私鑰 (請保密!)
sui keytool export --key-identity <your-address>
# 複製 Private Key (hex) 的值
```

---

### 第五步: 測試合約

```bash
# 使用互動工具測試
./scripts/interact.sh

# 選項 1: 鑄造 TaxCoin
# 選項 2: 查詢餘額
# 選項 3: 創建退稅 NFT
# ...
```

---

## 🧪 測試範例

### 範例 1: 鑄造 100 TaxCoin

```bash
# 設置環境變數
export PACKAGE_ID=0xabc123...
export TREASURY_CAP=0xdef456...
export ADMIN_CAP=0xghi789...

# 鑄造給自己
sui client call \
  --package $PACKAGE_ID \
  --module taxcoin \
  --function mint \
  --args $TREASURY_CAP $ADMIN_CAP 10000000000 $(sui client active-address) "test-001" \
  --gas-budget 10000000
```

### 範例 2: 查詢結果

```bash
# 查詢交易
sui client tx <TX_HASH>

# 在 Explorer 查看
open "https://suiexplorer.com/txblock/<TX_HASH>?network=testnet"
```

---

## 🔧 常見問題

### Q: Gas 不足怎麼辦?

```bash
# 再次申請測試代幣
sui client faucet

# 如果還是不行,等待 24 小時後重試
```

### Q: 構建失敗?

```bash
# 清理並重新構建
sui move clean
sui move build
```

### Q: 部署失敗?

```bash
# 確認網路連接
sui client switch --env testnet

# 確認餘額
sui client gas

# 增加 gas budget
sui client publish --gas-budget 200000000
```

### Q: 如何查看已部署的合約?

```bash
# 查詢 Package
sui client object $PACKAGE_ID

# 查詢 TreasuryCap
sui client object $TREASURY_CAP
```

---

## 📚 下一步

- ✅ 閱讀完整文檔: [README.md](README.md)
- ✅ 查看整合指南: [../docs/BLOCKCHAIN_INTEGRATION.md](../docs/BLOCKCHAIN_INTEGRATION.md)
- ✅ 測試所有功能: `./scripts/interact.sh`
- ✅ 整合後端服務

---

## 🆘 需要幫助?

- **文檔**: [blockchain/README.md](README.md)
- **Sui 官方**: https://docs.sui.io/
- **Explorer**: https://suiexplorer.com/?network=testnet

---

**預計時間**: 5-10 分鐘
**難度**: ⭐⭐ (中等)
**前置需求**: Node.js, Sui CLI

---

祝您部署順利! 🚀
