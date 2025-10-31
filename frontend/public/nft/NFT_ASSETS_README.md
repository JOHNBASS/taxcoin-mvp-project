# TaxCoin MVP - NFT 資產總覽

## 📁 完整文件清單

```
frontend/public/nft/
├── 投資池 NFT (Pool Share)
│   ├── pool-share-false.svg       (3.2 KB) - 投資中狀態
│   ├── pool-share-true.svg        (4.4 KB) - 已結算狀態
│   └── preview.html               (10 KB)  - 投資池 NFT 預覽頁面
│
├── 退稅證明 NFT (Tax Claim)
│   ├── tax-claim-0.svg            (3.3 KB) - 待審核 (STATUS_PENDING)
│   ├── tax-claim-1.svg            (3.7 KB) - 已核准 (STATUS_APPROVED)
│   ├── tax-claim-2.svg            (3.3 KB) - 已拒絕 (STATUS_REJECTED)
│   ├── tax-claim-3.svg            (5.2 KB) - 已發放 (STATUS_DISBURSED)
│   └── tax-claim-preview.html     (16 KB)  - 退稅證明 NFT 預覽頁面
│
└── 文檔
    ├── README.md                  - 投資池 NFT 詳細說明
    └── NFT_ASSETS_README.md       - 本文件（總覽）
```

---

## 🎨 1. 投資池 NFT (Pool Share)

### 概述
投資池份額憑證 NFT，用於表示用戶在 RWA 投資池中的份額。

### NFT 狀態與圖片

| 狀態 | 圖片檔案 | 主色調 | 視覺特徵 |
|------|---------|--------|----------|
| 投資中<br>`is_settled = false` | `pool-share-false.svg` | 藍綠漸層<br>#3B82F6 → #10B981 | • 向上箭頭<br>• 脈衝動畫<br>• 動態波浪線 |
| 已結算<br>`is_settled = true` | `pool-share-true.svg` | 金色漸層<br>#F59E0B → #FBBF24 | • 綠色對勾<br>• 金幣背景<br>• 星光閃爍 |

### Display 屬性

```json
{
  "name": "投資池份額憑證 #<amount>",
  "description": "RWA 投資池份額憑證，可獲得投資收益",
  "image_url": "https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-<is_settled>.svg",
  "pool_id": "<pool_address>",
  "amount": "<investment_amount>",
  "expected_yield": "<expected_yield>",
  "is_settled": "<true|false>",
  "actual_yield": "<actual_yield>"
}
```

### 智能合約
- **文件位置**: `blockchain/contracts/sources/rwa_pool.move`
- **Display 設定**: 第 159-179 行
- **測試案例**: `blockchain/contracts/tests/rwa_pool_tests.move`

### 預覽
打開 `preview.html` 在瀏覽器中查看兩種狀態的視覺效果。

---

## 📜 2. 退稅證明 NFT (Tax Claim Certificate)

### 概述
退稅申請證明 NFT，每筆退稅申請自動生成一個唯一的 NFT，可追蹤退稅申請的完整生命週期。

### NFT 狀態與圖片

| 狀態碼 | 狀態名稱 | 圖片檔案 | 主色調 | 視覺特徵 |
|--------|----------|---------|--------|----------|
| 0 | STATUS_PENDING<br>待審核 | `tax-claim-0.svg` | 灰色<br>#94A3B8 | • 時鐘圖標<br>• 指針旋轉<br>• 虛線圓環旋轉 |
| 1 | STATUS_APPROVED<br>已核准 | `tax-claim-1.svg` | 綠色<br>#10B981 | • 大對勾符號<br>• 認證標記<br>• 閃爍星星 |
| 2 | STATUS_REJECTED<br>已拒絕 | `tax-claim-2.svg` | 紅色<br>#EF4444 | • X 錯誤符號<br>• 警告三角<br>• 脈衝警示 |
| 3 | STATUS_DISBURSED<br>已發放 | `tax-claim-3.svg` | 紫色<br>#8B5CF6 | • T$ 符號<br>• 金幣堆疊<br>• 飄落動畫 |

### Display 屬性

```json
{
  "name": "退稅證明 NFT #<claim_id>",
  "description": "TaxCoin 退稅申請證明，可追蹤退稅申請狀態",
  "image_url": "https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-<status>.svg",
  "claim_id": "<claim_id>",
  "did": "<user_did>",
  "original_amount": "<purchase_amount>",
  "tax_amount": "<tax_refund_amount>",
  "taxcoin_amount": "<taxcoin_amount>",
  "merchant_name": "<merchant_name>",
  "status": "<0|1|2|3>",
  "purchase_date": "<timestamp>"
}
```

### 智能合約
- **文件位置**: `blockchain/contracts/sources/tax_claim_nft.move`
- **Display 設定**: 第 99-137 行
- **狀態管理**: 第 22-25 行

### 狀態流程

```
用戶提交申請
    ↓
鑄造 NFT (status = 0)
顯示: tax-claim-0.svg (灰色時鐘)
    ↓
    ├─→ 審核通過
    │   status = 1
    │   顯示: tax-claim-1.svg (綠色對勾)
    │   ↓
    │   發放 TaxCoin
    │   status = 3
    │   顯示: tax-claim-3.svg (紫色 T$)
    │
    └─→ 審核拒絕
        status = 2
        顯示: tax-claim-2.svg (紅色 X)
```

### 預覽
打開 `tax-claim-preview.html` 在瀏覽器中查看四種狀態的視覺效果。

---

## 🌐 部署 URL

### 投資池 NFT
- 投資中: `https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-false.svg`
- 已結算: `https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-true.svg`

### 退稅證明 NFT
- 待審核: `https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-0.svg`
- 已核准: `https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-1.svg`
- 已拒絕: `https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-2.svg`
- 已發放: `https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-3.svg`

### 預覽頁面
- 投資池預覽: `https://taxcoin-mvp.transferhelper.com.tw/nft/preview.html`
- 退稅證明預覽: `https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-preview.html`

---

## 📊 技術規格

### 共同特點
- **格式**: SVG (Scalable Vector Graphics)
- **尺寸**: 400 x 400 像素
- **顏色空間**: RGB
- **動畫**: CSS Animations (內嵌)
- **瀏覽器支援**: 所有現代瀏覽器（Chrome, Firefox, Safari, Edge）
- **移動設備**: 完全支援（iOS, Android）
- **解析度**: 無限縮放（向量圖形）

### 檔案大小
- 投資池 NFT: 3.2 KB - 4.4 KB
- 退稅證明 NFT: 3.3 KB - 5.2 KB
- 平均: ~3.8 KB（非常輕量）

### 動畫效果
所有 NFT 都包含 CSS 動畫：
- ✅ 不需要 JavaScript
- ✅ GPU 加速
- ✅ 低功耗
- ✅ 循環播放

---

## 🎯 使用指南

### 本地開發預覽

```bash
# 方法 1：直接打開 HTML
open frontend/public/nft/preview.html
open frontend/public/nft/tax-claim-preview.html

# 方法 2：啟動開發服務器
cd frontend
npm run dev
# 訪問:
# http://localhost:5173/nft/preview.html
# http://localhost:5173/nft/tax-claim-preview.html
```

### 生產環境部署

1. **確保 nginx 配置正確**：
   ```nginx
   location /nft/ {
       alias /app/nft/;
       add_header Cache-Control "public, max-age=31536000";
   }
   ```

2. **測試圖片可訪問**：
   ```bash
   curl https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-false.svg
   curl https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-0.svg
   ```

3. **驗證 CORS 設定**（如需跨域）：
   ```nginx
   add_header Access-Control-Allow-Origin "*";
   ```

---

## 🔄 狀態切換機制

### 投資池 NFT

```move
// 投資時
share.is_settled = false  → 顯示 pool-share-false.svg

// 領取收益後
share.is_settled = true   → 顯示 pool-share-true.svg
```

**觸發點**: 調用 `claim_yield()` 函數

### 退稅證明 NFT

```move
// 提交申請
nft.status = 0  → 顯示 tax-claim-0.svg (待審核)

// 審核通過
nft.status = 1  → 顯示 tax-claim-1.svg (已核准)

// 審核拒絕
nft.status = 2  → 顯示 tax-claim-2.svg (已拒絕)

// 發放 TaxCoin
nft.status = 3  → 顯示 tax-claim-3.svg (已發放)
```

**觸發點**: 調用 `update_status()` 或 `disburse()` 函數

---

## ✅ 測試清單

### 功能測試
- [ ] 所有 SVG 文件可正常顯示
- [ ] 動畫效果正常播放
- [ ] 預覽頁面在不同瀏覽器正常運作
- [ ] 圖片在移動設備正常顯示

### 部署測試
- [ ] 所有 URL 可通過 HTTPS 訪問
- [ ] 圖片載入速度 < 500ms
- [ ] 智能合約 Display 正確指向圖片 URL
- [ ] NFT 在 Sui 錢包中正確顯示

### 狀態切換測試
- [ ] 投資池：投資 → 結算狀態切換正常
- [ ] 退稅：待審核 → 已核准切換正常
- [ ] 退稅：待審核 → 已拒絕切換正常
- [ ] 退稅：已核准 → 已發放切換正常

---

## 🎨 設計理念

### 投資池 NFT
- **投資中**: 使用藍綠色系，傳達「成長」與「活躍」
- **已結算**: 使用金色系，象徵「收益」與「完成」

### 退稅證明 NFT
- **待審核**: 使用灰色系，表示「處理中」與「等待」
- **已核准**: 使用綠色系，表示「通過」與「成功」
- **已拒絕**: 使用紅色系，表示「錯誤」與「警告」
- **已發放**: 使用紫色系，象徵「價值」與「完成」（結合金色點綴）

### 動畫設計
- 所有動畫都經過精心設計，確保：
  - 🎯 視覺吸引力
  - ⚡ 性能優化
  - 📱 移動設備友好
  - ♿ 無障礙支援

---

## 📚 相關文檔

### 智能合約文檔
- [rwa_pool.move](../../../blockchain/contracts/sources/rwa_pool.move) - 投資池合約
- [tax_claim_nft.move](../../../blockchain/contracts/sources/tax_claim_nft.move) - 退稅證明合約

### 測試文檔
- [rwa_pool_tests.move](../../../blockchain/contracts/tests/rwa_pool_tests.move) - 投資池測試
- [README_TESTING.md](../../../blockchain/contracts/tests/README_TESTING.md) - 測試指南

---

## 💡 未來優化建議

### 短期（v1.1）
- [ ] 添加深色模式版本
- [ ] 生成 PNG 備份（向下兼容）
- [ ] 添加社交分享預覽圖

### 中期（v1.2）
- [ ] 根據金額大小調整視覺效果
- [ ] 添加多語言版本（英文、日文）
- [ ] 實現動態參數（如顯示實際金額）

### 長期（v2.0）
- [ ] 3D 版本 NFT
- [ ] 互動式 NFT（可點擊查看詳情）
- [ ] 個性化 NFT（用戶可自定義顏色）

---

**TaxCoin MVP** • Powered by Sui Blockchain • NFT Assets v1.0
