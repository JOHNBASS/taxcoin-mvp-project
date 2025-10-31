# TaxCoin 智能合約部署成功 ✅

**部署時間**: 2025-10-24
**Transaction Digest**: `2LR1RqFjYFVsDebmwCH2ju6BSY2NVbFadkDCE2SKqURV`

---

## 📦 部署的新功能

本次部署新增了以下功能：

1. ✅ **NFT Display 支援** - PoolShare 和 TaxClaimNFT 現在可以在錢包中顯示動態圖片
2. ✅ **測試輔助函數** - 新增 `#[test_only]` 函數方便快速測試
3. ✅ **動態 NFT 圖片** - 根據狀態 (is_settled, status) 顯示不同圖片

---

## 🆔 新的 Object IDs

### Package ID
```
0x79468a7b87f4d46a9e4daf02a7f77ad1f4b730fa786c44d4ffbe628bbd1e8844
```

### TreasuryCap (鑄造 TaxCoin)
```
0xc53ba7edd47b182769f2d687f91c99731608d82183ad335c6e1885bc1cc5716a
```

### AdminCap Objects (管理員權限)

| 合約模組 | Object ID |
|---------|-----------|
| TaxCoin | `0xded83bda092e4cc84d2a63658dff2d8f5c25e1768c285d06b7a3d428d6bdc869` |
| NFT | `0x99f7256991d42a5f895aac6a06094861731721173911127341a4e4b40d60e91c` (UpgradeCap) |
| **Tax Claim NFT** | **`0xeaab12391d50500b5c3fbde7c73536330359e958a35fba08085b62911b52dd67`** ✅ |
| RWA Token | `0xc39d63718c8aee8320e5b0a6d688fca421e691d98b1906bb8f104fac50cdfe02` |
| RWA Pool | `0x6cf24ddf100898f1f2d404df4f9e5b731cfc8c36bb0d26ca3a076165697467e8` |
| Exchange | `0x78c19513a8c02307030b3298b6da49aadfd477a06a8f69eadf47c8bf9f3d6ad9` |

### Exchange Pool (Shared Object)
```
0xdbcf17e22cdd4b32e82cecf818384cc71a345fa8dfe1c0a2c60c7181dab8378d
```

### Display Objects (NFT 顯示設定)

| NFT 類型 | Display Object ID |
|---------|-------------------|
| PoolShare | `0x3dcb4cb0c5238a3cc745da50cf2272e4a7b336d3e2da2360877ed5cf195f6e36` |
| TaxClaimNFT | `0x3bfdb6c1388951a6b62a8b04957b6ac627141abbff4d283b4d66e246a8c113c2` |

### Publisher Object
```
0x9a7b754712e483847848c5421fed21fad9b2c3229fde55c32d1c3a2c0500fe3c
```

### UpgradeCap (合約升級權限)
```
0xf90f1a204af14f19ef2b4540f1a36bc6bae79fe89cfdf49e4b420dedb45e03b6
```

---

## 🖼️ NFT 圖片資源

所有 NFT 圖片已部署到前端靜態文件目錄：

**Base URL**: `https://taxcoin-mvp.transferhelper.com.tw/nft/`

### PoolShare NFT (投資池份額)
- **投資中**: [pool-share-false.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-false.svg)
  - 藍綠漸層色
  - 動態向上箭頭
  - 脈衝圓環動畫

- **已結算**: [pool-share-true.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/pool-share-true.svg)
  - 金色漸層
  - 綠色勾選標記
  - 錢幣背景

### TaxClaimNFT (退稅證明)

| 狀態 | 檔案 | 說明 |
|-----|------|------|
| 0 - 待審核 | [tax-claim-0.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-0.svg) | 灰色主題，旋轉時鐘動畫 |
| 1 - 已核准 | [tax-claim-1.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-1.svg) | 綠色主題，大型勾選標記 |
| 2 - 已拒絕 | [tax-claim-2.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-2.svg) | 紅色主題，X 符號 |
| 3 - 已發放 | [tax-claim-3.svg](https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-3.svg) | 紫色主題，T$ 符號和金幣堆疊 |

---

## 🔗 相關連結

- **Sui Explorer**: https://suiscan.xyz/testnet/tx/2LR1RqFjYFVsDebmwCH2ju6BSY2NVbFadkDCE2SKqURV
- **Package Object**: https://suiscan.xyz/testnet/object/0x79468a7b87f4d46a9e4daf02a7f77ad1f4b730fa786c44d4ffbe628bbd1e8844
- **前端應用**: https://taxcoin-mvp.transferhelper.com.tw/
- **NFT 圖片預覽**:
  - [PoolShare Preview](https://taxcoin-mvp.transferhelper.com.tw/nft/preview.html)
  - [TaxClaimNFT Preview](https://taxcoin-mvp.transferhelper.com.tw/nft/tax-claim-preview.html)

---

## ✅ 已完成的配置更新

1. ✅ [backend/.env](../backend/.env) - 已更新所有 Object IDs
2. ✅ [frontend/.env](../frontend/.env) - 已更新 Package ID
3. ✅ Docker 容器已重啟 (backend + frontend)
4. ✅ 服務運行正常

---

## 🧪 如何驗證 NFT Display

### 方法 1：在 Sui Wallet 中查看

1. 創建投資池或退稅申請
2. 當您獲得 NFT 後，在 Sui Wallet 中應該會看到動態圖片

### 方法 2：使用 Sui Explorer

1. 前往 Sui Explorer
2. 查詢您的錢包地址
3. 點擊任何 PoolShare 或 TaxClaimNFT
4. 應該會看到 Display 欄位顯示圖片和屬性

### 方法 3：測試投資流程

使用新的測試輔助函數快速測試：

```move
// 在測試中使用
use rwa_pool::set_maturity_date_for_testing;
use rwa_pool::advance_to_maturity_for_testing;
use rwa_pool::get_investment_amount;
use rwa_pool::share_info;

// 快速推進時間到到期日
advance_to_maturity_for_testing(&mut pool, clock);

// 查看投資者資訊
let amount = get_investment_amount(&pool, investor_address);
let (pool_id, amount, yield, settled) = share_info(&share);
```

---

## 💰 Gas 費用統計

| 項目 | 金額 (MIST) | 金額 (SUI) |
|-----|------------|-----------|
| Storage Cost | 137,142,000 | 0.137142 |
| Computation Cost | 2,000,000 | 0.002 |
| Storage Rebate | -978,120 | -0.00097812 |
| **總計** | **138,163,880** | **~0.138 SUI** |

---

## 📝 下次部署注意事項

1. **Gas Budget**: 建議使用 200000000 MIST (0.2 SUI)
2. **指定 Gas Coin**: 使用 `--gas` 參數指定餘額充足的 coin
3. **備份舊配置**: 部署前備份 .env 文件
4. **記錄 Object IDs**: 部署後立即記錄所有新的 Object IDs

---

## 🎉 部署完成！

所有智能合約已成功部署並配置完成。NFT Display 功能現已啟用！

**下一步**: 測試投資流程並驗證 NFT 在錢包中的顯示效果。
