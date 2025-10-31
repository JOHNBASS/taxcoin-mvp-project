# RWA Pool Share NFT Assets

## 📁 文件清單

```
frontend/public/nft/
├── pool-share-false.svg    (3.2 KB) - 投資中狀態
├── pool-share-true.svg     (4.4 KB) - 已結算狀態
├── preview.html            (10 KB)  - 瀏覽器預覽頁面
└── README.md               - 本文件
```

## 🎨 NFT 設計說明

### pool-share-false.svg - 投資中
**視覺設計：**
- 🎨 漸層色：藍色 (#3B82F6) → 青色 (#06B6D4) → 綠色 (#10B981)
- 📈 主要圖標：向上箭頭（象徵增長）
- ✨ 動畫效果：
  - 脈衝圓環（2秒循環）
  - 動態波浪線（2秒循環）
- 🏷️ 狀態標籤：藍色「投資中」

**設計理念：**
- 動態、活躍的視覺語言
- 傳達「進行中」的概念
- 強調投資成長潛力

### pool-share-true.svg - 已結算
**視覺設計：**
- 🎨 漸層色：橙色 (#F59E0B) → 黃色 (#EAB308) → 金色 (#FBBF24)
- ✅ 主要圖標：綠色對勾（象徵完成）
- 💰 背景元素：金幣圓環（象徵收益）
- ⭐ 裝飾元素：星星、徽章
- ✨ 動畫效果：閃爍星光（1.5-2秒循環）
- 🏷️ 狀態標籤：綠色「已結算」

**設計理念：**
- 穩定、完成的視覺語言
- 金色代表價值與收益
- 綠色對勾強調成功完成

## 🔗 URL 配置

### 智能合約設定
```move
// blockchain/contracts/sources/rwa_pool.move (第 167 行)
display::add(
    &mut display,
    string::utf8(b"image_url"),
    string::utf8(b"https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-{is_settled}.svg")
);
```

### URL 對應
- `is_settled = false` → `https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-false.svg`
- `is_settled = true` → `https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-true.svg`

## 🖼️ 預覽方式

### 方法 1：本地預覽（推薦）
在瀏覽器中打開：
```
frontend/public/nft/preview.html
```

或使用命令行：
```bash
# macOS
open frontend/public/nft/preview.html

# Linux
xdg-open frontend/public/nft/preview.html

# Windows
start frontend/public/nft/preview.html
```

### 方法 2：開發服務器預覽
```bash
cd frontend
npm run dev
# 訪問 http://localhost:5173/nft/preview.html
```

### 方法 3：生產環境預覽
部署後訪問：
- https://taxcoin-mvp.transferhelper.com.tw/nft/preview.html
- https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-false.svg
- https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-true.svg

## 📊 技術規格

| 屬性 | 值 |
|------|-----|
| 格式 | SVG (Scalable Vector Graphics) |
| 尺寸 | 400 x 400 px |
| 顏色空間 | RGB |
| 動畫 | CSS Animations (內嵌) |
| 檔案大小 | 3.2 KB - 4.4 KB |
| 瀏覽器支援 | 所有現代瀏覽器 |
| 移動設備 | 完全支援 |
| 解析度 | 無限縮放（向量圖） |

## 🔄 NFT 狀態切換流程

```
1. 用戶投資
   ↓
2. 鑄造 PoolShare NFT
   is_settled = false
   image_url = .../pool-share-false.svg
   ↓
3. 投資池到期 + 結算
   ↓
4. 用戶調用 claim_yield()
   ↓
5. NFT 更新狀態
   is_settled = true
   image_url = .../pool-share-true.svg
   ✓ 圖片自動切換！
```

## 🎯 Display 屬性

NFT 將在 Sui 錢包中顯示以下屬性：

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

## 🚀 部署清單

### ✅ 已完成
- [x] 生成投資中 NFT 圖片
- [x] 生成已結算 NFT 圖片
- [x] 放置到 `frontend/public/nft/` 目錄
- [x] 更新智能合約 Display URL
- [x] 創建預覽頁面
- [x] 更新測試文檔

### 📋 待辦事項
- [ ] 部署前端到生產環境
- [ ] 驗證圖片可通過 URL 訪問
- [ ] 部署智能合約到測試網
- [ ] 測試 NFT Display 顯示
- [ ] 驗證圖片自動切換功能

## 🛠️ 自定義修改

如果需要修改 NFT 設計：

1. **修改顏色：** 編輯 SVG 文件中的 `linearGradient` 定義
2. **調整動畫：** 修改 `<animate>` 標籤的參數
3. **更換圖標：** 替換主要的 `<path>` 或 `<circle>` 元素
4. **添加文字：** 使用 `<text>` 標籤（注意字體相容性）

## 💡 最佳實踐

### SVG 優勢
- ✅ 無損縮放（適合任何螢幕）
- ✅ 檔案小（快速載入）
- ✅ 支援動畫（無需 JavaScript）
- ✅ 易於修改（純文字格式）
- ✅ SEO 友好（可索引）

### 注意事項
- ⚠️ 避免使用外部字體（可能無法載入）
- ⚠️ 保持檔案大小 < 100 KB
- ⚠️ 測試跨瀏覽器相容性
- ⚠️ 確保 HTTPS 可訪問

## 📞 支援

如有問題或需要修改設計，請參考：
- 測試文檔：`blockchain/contracts/tests/README_TESTING.md`
- 智能合約：`blockchain/contracts/sources/rwa_pool.move`
- 測試案例：`blockchain/contracts/tests/rwa_pool_tests.move`

---

**TaxCoin MVP** • Powered by Sui Blockchain
