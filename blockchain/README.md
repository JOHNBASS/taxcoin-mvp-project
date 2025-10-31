# TAXCOIN 智能合約文檔

> Sui Move 智能合約實作 - AI 區塊鏈退稅驗證平台

**版本**: 1.0.0
**區塊鏈**: Sui Testnet
**語言**: Move Language
**最後更新**: 2025-10-20

---

## 📋 目錄

- [概述](#概述)
- [合約架構](#合約架構)
- [安裝與設置](#安裝與設置)
- [合約說明](#合約說明)
- [部署指南](#部署指南)
- [使用範例](#使用範例)
- [測試](#測試)
- [常見問題](#常見問題)

---

## 概述

TAXCOIN 智能合約套件包含四個主要模組,實現完整的退稅流程與 RWA (Real World Assets) tokenization:

1. **TaxCoin** - 可替代代幣 (類似 ERC-20)
2. **TaxClaimNFT** - 退稅申請 NFT
3. **RWAToken** - 債權代幣化
4. **RWAPool** - 投資池管理

### 核心功能

- ✅ 鑄造 TaxCoin 給通過 KYC 的旅客 (1 TaxCoin = 1 TWD)
- ✅ 創建退稅申請 NFT,記錄每筆退稅資訊
- ✅ 將退稅債權 tokenization 為 RWA Token
- ✅ 創建投資池,投資者可購買份額獲得收益
- ✅ 自動收益計算與分配
- ✅ 到期自動結算

---

## 合約架構

```
blockchain/
├── Move.toml                  # 專案配置
├── contracts/
│   └── sources/
│       ├── taxcoin.move       # TaxCoin 代幣模組
│       ├── tax_claim_nft.move # 退稅申請 NFT 模組
│       ├── rwa_token.move     # RWA 債權代幣模組
│       └── rwa_pool.move      # 投資池管理模組
├── scripts/
│   ├── deploy.sh              # 部署腳本
│   ├── test.sh                # 測試腳本
│   └── interact.sh            # 互動腳本
└── README.md                  # 本文檔
```

### 合約依賴關係

```
┌─────────────┐
│  TaxCoin    │  鑄造 Token 給旅客
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ TaxClaimNFT     │  記錄退稅申請
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  RWAToken       │  債權 tokenization
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  RWAPool        │  投資池管理
└─────────────────┘
```

---

## 安裝與設置

### ⚡ 快速修復編譯問題

如果遇到 `git clone --filter=tree:0` 錯誤,請參考:

- 📖 [QUICK_FIX.md](./QUICK_FIX.md) - 一鍵修復指南
- 📖 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 完整故障排除

或執行自動化腳本:

```bash
./scripts/setup-sui-build.sh
```

### 前置需求

1. **安裝 Sui CLI**
   ```bash
   # macOS
   brew install sui

   # 或從源碼安裝
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
   ```

2. **驗證安裝**
   ```bash
   sui --version
   # 應顯示: sui 1.x.x

   git --version
   # 應顯示: git >= 2.40.0
   ```

3. **配置 Sui 錢包**
   ```bash
   # 創建新錢包
   sui client new-address ed25519

   # 切換到 testnet
   sui client switch --env testnet

   # 查看當前地址
   sui client active-address

   # 獲取 testnet 代幣 (用於 gas)
   sui client faucet
   ```

### 專案設置

```bash
cd blockchain

# 檢查配置
cat Move.toml

# 構建合約
sui move build

# 執行測試
sui move test
```

---

## 合約說明

### 1. TaxCoin (taxcoin.move)

可替代代幣模組,用於表示退稅金額。

#### 關鍵功能

```move
// 鑄造 TaxCoin
public entry fun mint(
    treasury: &mut TreasuryCap<TAXCOIN>,
    _admin_cap: &AdminCap,
    amount: u64,
    recipient: address,
    claim_id: vector<u8>,
    ctx: &mut TxContext
)

// 批量鑄造
public entry fun batch_mint(
    treasury: &mut TreasuryCap<TAXCOIN>,
    _admin_cap: &AdminCap,
    amounts: vector<u64>,
    recipients: vector<address>,
    claim_ids: vector<vector<u8>>,
    ctx: &mut TxContext
)

// 銷毀代幣 (兌現時)
public entry fun burn(
    treasury: &mut TreasuryCap<TAXCOIN>,
    coin: Coin<TAXCOIN>,
    ctx: &mut TxContext
)

// 轉帳
public entry fun transfer(
    coin: Coin<TAXCOIN>,
    recipient: address,
    _ctx: &mut TxContext
)
```

#### 事件

- `MintRecord` - 鑄造記錄
- `BurnRecord` - 銷毀記錄

#### 參數說明

- **amount**: 以最小單位計算 (10^8 精度),例如 100,000,000 = 1 TaxCoin = 1 TWD
- **claim_id**: 對應後端資料庫的退稅申請 ID

---

### 2. TaxClaimNFT (tax_claim_nft.move)

退稅申請 NFT 模組,每筆退稅申請生成一個唯一 NFT。

#### 關鍵功能

```move
// 鑄造退稅申請 NFT
public entry fun mint(
    _admin_cap: &AdminCap,
    claim_id: vector<u8>,
    did: vector<u8>,
    original_amount: u64,
    tax_amount: u64,
    merchant_name: vector<u8>,
    purchase_date: u64,
    receipt_hash: vector<u8>,
    recipient: address,
    ctx: &mut TxContext
)

// 審核通過
public entry fun approve(
    _admin_cap: &AdminCap,
    nft: &mut TaxClaimNFT,
    ctx: &mut TxContext
)

// 拒絕申請
public entry fun reject(
    _admin_cap: &AdminCap,
    nft: &mut TaxClaimNFT,
    reason: vector<u8>,
    ctx: &mut TxContext
)

// 標記為已發放
public entry fun mark_disbursed(
    _admin_cap: &AdminCap,
    nft: &mut TaxClaimNFT,
    ctx: &mut TxContext
)
```

#### NFT 結構

```move
public struct TaxClaimNFT has key, store {
    id: UID,
    claim_id: String,           // 申請 ID
    did: String,                // 申請者 DID
    original_amount: u64,       // 原始金額 (分)
    tax_amount: u64,            // 退稅金額 (分)
    taxcoin_amount: u64,        // TaxCoin 數量
    merchant_name: String,      // 商家名稱
    purchase_date: u64,         // 購買日期 (Unix 時間戳)
    receipt_hash: String,       // 收據 hash
    status: u8,                 // 0=待審核, 1=已核准, 2=已拒絕, 3=已發放
    created_at: u64,
    reviewed_at: u64,
    disbursed_at: u64,
    rejected_reason: String
}
```

#### 事件

- `NFTMinted` - NFT 鑄造
- `NFTStatusUpdated` - 狀態更新
- `TaxCoinDisbursed` - TaxCoin 發放

---

### 3. RWAToken (rwa_token.move)

債權代幣化模組,將退稅債權轉換為可交易的 Token。

#### 關鍵功能

```move
// 創建 RWA Token
public entry fun create_token(
    _admin_cap: &AdminCap,
    claim_id: vector<u8>,
    amount: u64,
    interest_rate: u64,        // 基點 (200 = 2%)
    maturity_date: u64,        // Unix 時間戳
    pool_id: vector<u8>,
    ctx: &mut TxContext
)

// 標記為已售
public entry fun mark_sold(
    _admin_cap: &AdminCap,
    token: &mut RWAToken,
    buyer: address,
    ctx: &mut TxContext
)

// 兌現債權
public entry fun redeem(
    _admin_cap: &AdminCap,
    token: &mut RWAToken,
    ctx: &mut TxContext
)

// 批量兌現
public entry fun batch_redeem(
    _admin_cap: &AdminCap,
    tokens: vector<RWAToken>,
    ctx: &mut TxContext
)
```

#### Token 結構

```move
public struct RWAToken has key, store {
    id: UID,
    claim_id: String,           // 對應的退稅申請 ID
    amount: u64,                // 債權金額 (分)
    interest_rate: u64,         // 年化利率 (基點)
    maturity_date: u64,         // 到期日
    status: u8,                 // 0=可售, 1=已售, 2=已兌現
    pool_id: String,            // 所屬投資池 ID
    owner: address,             // 當前持有者
    created_at: u64,
    sold_at: u64,
    redeemed_at: u64
}
```

#### 利息計算

使用簡單利息公式:
```
Interest = Principal × Annual Rate × (Days / 365)
```

---

### 4. RWAPool (rwa_pool.move)

投資池管理模組,投資者可購買份額獲得收益。

#### 關鍵功能

```move
// 創建投資池
public entry fun create_pool(
    _admin_cap: &AdminCap,
    name: vector<u8>,
    description: vector<u8>,
    target_amount: u64,        // 目標募集金額 (分)
    yield_rate: u64,           // 年化收益率 (基點)
    risk_level: u8,            // 0=低, 1=中, 2=高
    maturity_date: u64,        // 到期日
    claim_ids: vector<vector<u8>>,
    ctx: &mut TxContext
)

// 投資到池
public entry fun invest(
    pool: &mut RWAPool,
    payment: Coin<TAXCOIN>,
    ctx: &mut TxContext
)

// 結算池
public entry fun settle_pool(
    _admin_cap: &AdminCap,
    pool: &mut RWAPool,
    ctx: &mut TxContext
)

// 領取收益
public entry fun claim_yield(
    pool: &mut RWAPool,
    share: &mut PoolShare,
    ctx: &mut TxContext
)
```

#### Pool 結構

```move
public struct RWAPool has key {
    id: UID,
    name: String,
    description: String,
    target_amount: u64,         // 目標金額
    current_amount: u64,        // 當前金額
    yield_rate: u64,            // 收益率 (基點)
    risk_level: u8,             // 風險等級
    maturity_date: u64,         // 到期日
    status: u8,                 // 0=募集中, 1=已滿額, 2=已到期, 3=已結算
    investor_count: u64,
    investments: Table<address, u64>,
    balance: Balance<TAXCOIN>,
    claim_ids: vector<String>,
    created_at: u64,
    settled_at: u64
}
```

#### PoolShare (份額憑證)

```move
public struct PoolShare has key, store {
    id: UID,
    pool_id: address,
    investor: address,
    amount: u64,                // 投資金額
    expected_yield: u64,        // 預期收益
    invested_at: u64,
    is_settled: bool,
    actual_yield: u64
}
```

---

## 部署指南

### 1. 準備環境

```bash
# 確保在 testnet
sui client switch --env testnet

# 確認有足夠的 gas
sui client gas
```

### 2. 構建合約

```bash
cd blockchain
sui move build
```

### 3. 部署到 Testnet

```bash
# 使用部署腳本
./scripts/deploy.sh

# 或手動部署
sui client publish --gas-budget 100000000
```

### 4. 保存部署資訊

部署成功後,請保存以下資訊到 `.env`:

```env
# Sui 合約配置
SUI_PACKAGE_ID=0x...
SUI_TAXCOIN_TREASURY_CAP=0x...
SUI_TAXCOIN_ADMIN_CAP=0x...
SUI_TAX_CLAIM_ADMIN_CAP=0x...
SUI_RWA_TOKEN_ADMIN_CAP=0x...
SUI_RWA_POOL_ADMIN_CAP=0x...
```

### 5. 驗證部署

```bash
# 查詢 Package 資訊
sui client object <PACKAGE_ID>

# 查詢 TreasuryCap
sui client object <TREASURY_CAP_ID>
```

---

## 使用範例

### 範例 1: 鑄造 TaxCoin

```bash
# 設置環境變數
export PACKAGE_ID=0x...
export TREASURY_CAP=0x...
export ADMIN_CAP=0x...

# 鑄造 100 TaxCoin (100 TWD)
sui client call \
  --package $PACKAGE_ID \
  --module taxcoin \
  --function mint \
  --args $TREASURY_CAP $ADMIN_CAP 10000000000 0xrecipient "claim-001" \
  --gas-budget 10000000
```

### 範例 2: 創建退稅申請 NFT

```bash
sui client call \
  --package $PACKAGE_ID \
  --module tax_claim_nft \
  --function mint \
  --args $ADMIN_CAP \
    "\"claim-001\"" \
    "\"did:sui:0x123...\"" \
    20000 \
    1000 \
    "\"7-Eleven\"" \
    1729404000000 \
    "\"ipfs://Qm...\"" \
    0xrecipient \
  --gas-budget 10000000
```

### 範例 3: 創建投資池

```bash
sui client call \
  --package $PACKAGE_ID \
  --module rwa_pool \
  --function create_pool \
  --args $ADMIN_CAP \
    "\"退稅債權池 #1\"" \
    "\"7天期, 2% 收益率\"" \
    1000000000 \
    200 \
    1 \
    1730000000000 \
    "[]" \
  --gas-budget 10000000
```

### 範例 4: 投資到池

```bash
# 假設已有 TaxCoin
export POOL_ID=0x...
export COIN_ID=0x...

sui client call \
  --package $PACKAGE_ID \
  --module rwa_pool \
  --function invest \
  --args $POOL_ID $COIN_ID \
  --gas-budget 10000000
```

### 範例 5: 領取收益

```bash
export SHARE_ID=0x...

sui client call \
  --package $PACKAGE_ID \
  --module rwa_pool \
  --function claim_yield \
  --args $POOL_ID $SHARE_ID \
  --gas-budget 10000000
```

---

## 測試

### 執行單元測試

```bash
cd blockchain
./scripts/test.sh

# 或手動執行
sui move test
```

### 測試覆蓋

目前測試包括:
- ✅ TaxCoin 鑄造與轉帳
- ✅ TaxClaimNFT 創建與狀態更新
- ✅ RWAToken 創建與兌現
- ✅ RWAPool 投資與結算

### 測試網互動測試

```bash
# 使用互動腳本
./scripts/interact.sh
```

---

## 與後端整合

### 1. 安裝 Sui SDK

```bash
cd backend
npm install @mysten/sui.js
```

### 2. 初始化 Sui Client

```typescript
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const keypair = Ed25519Keypair.fromSecretKey(
  Buffer.from(process.env.SUI_PRIVATE_KEY!, 'hex')
);
```

### 3. 鑄造 TaxCoin 範例

```typescript
import { TransactionBlock } from '@mysten/sui.js/transactions';

async function mintTaxCoin(
  recipient: string,
  amount: number,
  claimId: string
) {
  const tx = new TransactionBlock();

  tx.moveCall({
    target: `${process.env.SUI_PACKAGE_ID}::taxcoin::mint`,
    arguments: [
      tx.object(process.env.SUI_TREASURY_CAP!),
      tx.object(process.env.SUI_ADMIN_CAP!),
      tx.pure(amount * 100000000), // 轉換為最小單位
      tx.pure(recipient),
      tx.pure(claimId)
    ],
  });

  const result = await client.signAndExecuteTransactionBlock({
    signer: keypair,
    transactionBlock: tx,
  });

  return result;
}
```

### 4. 監聽事件

```typescript
// 監聽 TaxCoin 鑄造事件
client.subscribeEvent({
  filter: {
    Package: process.env.SUI_PACKAGE_ID!,
  },
  onMessage(event) {
    if (event.type.includes('::taxcoin::MintRecord')) {
      console.log('TaxCoin 鑄造:', event.parsedJson);
      // 更新資料庫
    }
  },
});
```

---

## 常見問題

### Q1: 為什麼使用 u64 而不是 Decimal?

**A**: Move 語言不支持浮點數,我們使用整數表示金額:
- 金額以「分」為單位 (100 分 = 1 TWD)
- TaxCoin 使用 10^8 精度 (100,000,000 = 1 TaxCoin)

### Q2: 如何處理收益計算的精度問題?

**A**: 使用基點 (basis points) 表示利率:
- 200 基點 = 2%
- 計算時: `(本金 × 基點 × 天數) / (10000 × 365)`

### Q3: AdminCap 遺失怎麼辦?

**A**: AdminCap 是關鍵權限對象,請務必:
- 安全保管私鑰
- 使用多簽錢包
- 部署時立即備份 Object ID

### Q4: 如何升級合約?

**A**: Sui 支持合約升級:
```bash
sui client upgrade --gas-budget 100000000
```

### Q5: Gas 費用大約多少?

**A**: 典型操作的 gas 費用:
- 鑄造 TaxCoin: ~0.01 SUI
- 創建 NFT: ~0.015 SUI
- 投資到池: ~0.02 SUI
- 結算池: ~0.03 SUI

---

## 安全注意事項

⚠️ **重要提醒**:

1. **私鑰管理**
   - 永不將私鑰提交到 Git
   - 使用環境變數或密鑰管理服務
   - 生產環境使用硬體錢包

2. **權限控制**
   - AdminCap 僅給可信地址
   - 定期輪換管理員
   - 使用多簽錢包

3. **金額驗證**
   - 檢查投資金額範圍
   - 防止溢位攻擊
   - 驗證池狀態

4. **測試網限制**
   - Testnet 可能重置
   - 不保證數據持久性
   - 正式上線前需要審計

---

## 參考資源

- **Sui 官方文檔**: https://docs.sui.io/
- **Move 語言**: https://move-language.github.io/move/
- **Sui Explorer**: https://suiexplorer.com/
- **Sui SDK (TypeScript)**: https://sdk.mystenlabs.com/typescript

---

## 授權

MIT License

---

**版本歷史**:
- v1.0.0 (2025-10-20) - 初始版本
  - TaxCoin 模組
  - TaxClaimNFT 模組
  - RWAToken 模組
  - RWAPool 模組
  - 完整部署腳本
  - 文檔與範例

---

**維護者**: TAXCOIN MVP Team
**技術支援**: [GitHub Issues](https://github.com/your-repo/issues)
