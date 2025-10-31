# RWA Pool 測試指南

## 概述

本文檔說明如何測試 RWA 投資池的完整生命週期，包括投資、到期、結算和收益領取。

## 方案 C：最佳實踐測試方案

### 核心功能

#### 1. 測試輔助函數

在 `rwa_pool.move` 中新增了以下測試專用函數：

```move
#[test_only]
public fun set_maturity_date_for_testing(
    pool: &mut RWAPool,
    new_maturity_date: u64
)
```
- 直接設定池的到期時間
- 用於需要精確控制到期時間的測試場景

```move
#[test_only]
public fun advance_to_maturity_for_testing(
    pool: &mut RWAPool,
    ctx: &mut TxContext
)
```
- **推薦使用**：一鍵將池設為已到期狀態
- 自動設定 `maturity_date` 為當前時間之前
- 自動更新 `status` 為 `STATUS_MATURED`

```move
#[test_only]
public fun get_investment_amount(
    pool: &RWAPool,
    investor: address
): u64
```
- 查詢特定投資者的投資金額
- 用於驗證投資記錄

```move
#[test_only]
public fun share_info(share: &PoolShare): (address, address, u64, u64, bool, u64)
```
- 獲取 PoolShare NFT 的完整資訊
- 返回值：(pool_id, investor, amount, expected_yield, is_settled, actual_yield)

#### 2. NFT 動態圖片功能

PoolShare NFT 現在支援根據 `is_settled` 狀態顯示不同圖片：

```move
// Display 設定
image_url: "https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-{is_settled}.svg"
```

**圖片命名規則：**
- `pool-share-false.svg` - 投資中（is_settled = false）
- `pool-share-true.svg` - 已結算（is_settled = true）

**圖片位置：**
- 前端靜態檔案：`frontend/public/nft/`
- 訪問 URL：`https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-{is_settled}.svg`

**NFT 屬性：**
- `name`: 投資池份額憑證 #{amount}
- `description`: RWA 投資池份額憑證，可獲得投資收益
- `pool_id`: 所屬池的 ID
- `amount`: 投資金額
- `expected_yield`: 預期收益
- `is_settled`: 是否已結算
- `actual_yield`: 實際收益（結算後填入）

### NFT 生命週期

1. **投資時** → 鑄造 NFT，`is_settled = false`，顯示投資中圖片
2. **結算後領取收益時** → NFT 被標記為 `is_settled = true`，圖片自動切換為已結算
3. **NFT 不會被銷毀** → 作為投資憑證永久保留

## 測試案例說明

### 完整生命週期測試

`test_full_investment_lifecycle()` 涵蓋完整流程：

1. **創建投資池**（設定 10 秒後到期）
2. **用戶投資** → 收到 PoolShare NFT（投資中狀態）
3. **驗證 NFT 狀態** → `is_settled = false`
4. **強制到期** → 使用 `advance_to_maturity_for_testing()`
5. **管理員結算池** → `settle_pool()`
6. **投資者領取收益** → NFT 狀態更新為 `is_settled = true`
7. **驗證收到資金** → 本金 + 收益

### 時間控制策略

#### 方法 1：使用短期到期時間（推薦）✅

```move
let current_time = ts::ctx(&mut scenario).epoch_timestamp_ms();
create_pool(
    ...,
    maturity_date: current_time + 10000,  // 10 秒後到期（10,000 毫秒）
    ...
);
```

**優點：**
- 保持代碼邏輯不變
- 真實模擬時間流逝
- 毫秒精度足夠測試使用

#### 方法 2：使用測試輔助函數（快速測試）⚡

```move
// 創建池後，直接強制到期
rwa_pool::advance_to_maturity_for_testing(&mut pool, ts::ctx(&mut scenario));
```

**優點：**
- 立即到期，無需等待
- 適合 CI/CD 快速測試
- 不需要計算時間偏移

## 運行測試

```bash
# 編譯合約
cd blockchain/contracts
sui move build

# 運行所有測試
sui move test

# 運行特定測試
sui move test test_full_investment_lifecycle

# 顯示詳細輸出
sui move test --verbose
```

## 測試覆蓋率

### 正常流程測試
- ✅ `test_create_pool` - 創建投資池
- ✅ `test_invest_to_pool` - 投資並接收 NFT
- ✅ `test_full_investment_lifecycle` - 完整生命週期
- ✅ `test_multiple_investors` - 多投資者場景
- ✅ `test_check_and_update_status` - 狀態更新
- ✅ `test_helper_functions` - 測試輔助函數

### 錯誤處理測試
- ✅ `test_insufficient_investment_fails` - 投資金額不足
- ✅ `test_settle_before_maturity_fails` - 未到期前結算
- ✅ `test_claim_before_settlement_fails` - 未結算前領取

## 關鍵發現與設計決策

### 1. 到期時間計算方式

**問題：** 到期天數是從創建池時就固定的絕對時間戳，還是從募集成功後開始計算？

**答案：** 是創建池時設定的**絕對時間戳**。

**影響：**
- 早投資的人距離到期日更久 → 預期收益更高
- 晚投資的人距離到期日較短 → 預期收益較低

**計算公式（[rwa_pool.move:239-240](../sources/rwa_pool.move#L239-L240)）：**
```move
let days_to_maturity = (pool.maturity_date - tx_context::epoch_timestamp_ms(ctx)) / (24 * 60 * 60 * 1000);
let expected_yield = (amount * pool.yield_rate * days_to_maturity) / (10000 * 365);
```

**建議：**
如果您希望保證所有投資者享有相同的投資期限（例如 7 天），應該：
- 設定 `maturity_date = 預計募集結束日 + 7 天`
- 或在募集滿額後，動態調整到期日

### 2. NFT 設計決策

**問題：** 領取收益後 NFT 應該銷毀還是保留？

**答案：** 當前設計是**保留並標記**。

**原因：**
1. 作為投資憑證永久記錄
2. 可追溯歷史投資
3. 未來可用於信用評分、空投資格等

**實現方式：**
- `is_settled = true` 標記已結算
- `actual_yield` 記錄實際收益
- Display 自動切換圖片展示狀態

如需銷毀 NFT，可以修改 `claim_yield` 函數使用 `object::delete(id)`。

## 圖片資源

NFT 圖片已自動生成並放置在 `frontend/public/nft/` 目錄：

### 1. pool-share-false.svg - 投資中
- **設計風格：** 動態、進行中的視覺效果
- **顏色方案：** 藍色漸層 (#3B82F6 → #06B6D4 → #10B981)
- **動畫效果：**
  - 向上箭頭表示投資增長
  - 動態曲線表示活躍狀態
  - 脈衝圓環表示進行中
- **狀態標籤：** "投資中" (藍色背景)

### 2. pool-share-true.svg - 已結算
- **設計風格：** 完成、穩定的視覺效果
- **顏色方案：** 金色漸層 (#F59E0B → #EAB308 → #FBBF24)
- **視覺元素：**
  - 綠色對勾表示完成
  - 金幣背景表示收益
  - 星星裝飾表示成就
  - 閃爍效果表示價值
- **狀態標籤：** "已結算" (綠色背景)

### 圖片特點
- **格式：** SVG（可縮放向量圖形）
- **尺寸：** 400x400 像素
- **優勢：**
  - 無損縮放
  - 檔案小
  - 支援動畫
  - 高解析度顯示

## 常見問題

### Q: 測試時如何快速到期？
A: 使用 `advance_to_maturity_for_testing()` 函數。

### Q: 如何驗證 NFT 圖片是否正確切換？
A: 查看 `is_settled` 欄位，Display 會自動根據該值拼接 URL。

### Q: 可以改為秒數嗎？
A: 不需要。毫秒已經足夠精確，且 Sui 原生使用毫秒時間戳。

### Q: 測試時間如何控制？
A: Sui 測試框架使用 `epoch_timestamp_ms()`，可以透過測試輔助函數直接設定狀態。

## 下一步

1. 編譯合約確認無語法錯誤
2. 運行測試套件
3. 準備 NFT 圖片資源
4. 部署到測試網
5. 前端整合 Display 屬性展示
