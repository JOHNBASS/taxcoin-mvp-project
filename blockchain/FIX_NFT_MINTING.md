# NFT 鑄造錯誤修復

## 問題描述

用戶在點擊「發放 Token」時遇到以下錯誤：

```
NFT 鑄造失敗: Dry run failed, could not automatically determine a budget:
CommandArgumentError { arg_idx: 0, kind: TypeMismatch } in command 0
```

## 錯誤原因

錯誤訊息 `CommandArgumentError { arg_idx: 0, kind: TypeMismatch }` 表示第一個參數（`arg_idx: 0`）的類型不匹配。

### 根本原因

在重新部署智能合約後，所有的 AdminCap Object IDs 都改變了。後端代碼在調用 `tax_claim_nft::mint` 函數時，使用了錯誤的 AdminCap：

**錯誤的代碼** ([sui.service.ts:467](../backend/src/services/sui.service.ts#L467)):
```typescript
private getNFTAdminCap(): string {
  const nftAdminCap = process.env.SUI_NFT_ADMIN_CAP;  // ❌ 錯誤：這是舊的 NFT AdminCap
  // ...
}
```

**問題**:
- `tax_claim_nft` 模組有自己的 AdminCap (在 `init` 函數中創建)
- 部署時創建了新的 `TAX_CLAIM_NFT AdminCap`，Object ID 是 `0x51c63447e0f9f727d5a9eb7b9d9dbf8d4b666535f0cdb5b41cd0519645e595f5`
- 但後端代碼仍然使用環境變數 `SUI_NFT_ADMIN_CAP` (值為 `0x99f7256991d42a5f895aac6a06094861731721173911127341a4e4b40d60e91c`)
- 這個 Object ID 屬於不同的模組，導致類型不匹配

## 解決方案

### 1. 修改後端代碼

將 `getNFTAdminCap()` 函數改為使用正確的環境變數：

```typescript
// backend/src/services/sui.service.ts
private getNFTAdminCap(): string {
  const nftAdminCap = process.env.SUI_TAX_CLAIM_ADMIN_CAP;  // ✅ 正確
  if (!nftAdminCap) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '未配置 Tax Claim NFT AdminCap Object ID (SUI_TAX_CLAIM_ADMIN_CAP)'
    );
  }
  return nftAdminCap;
}
```

### 2. 環境變數配置

確保 [backend/.env](../backend/.env) 中配置了正確的 AdminCap：

```bash
# Tax Claim NFT 的 AdminCap (用於鑄造退稅 NFT)
SUI_TAX_CLAIM_ADMIN_CAP=0x51c63447e0f9f727d5a9eb7b9d9dbf8d4b666535f0cdb5b41cd0519645e595f5
```

### 3. 重啟服務

```bash
docker compose restart backend
```

## AdminCap 對應關係

部署後的各個模組 AdminCap：

| 模組 | 環境變數 | Object ID | 用途 |
|-----|---------|-----------|------|
| taxcoin | `SUI_TAXCOIN_ADMIN_CAP` | `0xded83bda092e4cc84d2a63658dff2d8f5c25e1768c285d06b7a3d428d6bdc869` | TaxCoin 管理 |
| nft | `SUI_NFT_ADMIN_CAP` | `0x99f7256991d42a5f895aac6a06094861731721173911127341a4e4b40d60e91c` | UpgradeCap (非 AdminCap) |
| **tax_claim_nft** | **`SUI_TAX_CLAIM_ADMIN_CAP`** | **`0xeaab12391d50500b5c3fbde7c73536330359e958a35fba08085b62911b52dd67`** | **退稅 NFT 鑄造** ✅ |
| rwa_token | `SUI_RWA_TOKEN_ADMIN_CAP` | `0xc39d63718c8aee8320e5b0a6d688fca421e691d98b1906bb8f104fac50cdfe02` | RWA Token 管理 |
| rwa_pool | `SUI_RWA_POOL_ADMIN_CAP` | `0x6cf24ddf100898f1f2d404df4f9e5b731cfc8c36bb0d26ca3a076165697467e8` | 投資池管理 |
| exchange | `SUI_EXCHANGE_ADMIN_CAP` | `0x78c19513a8c02307030b3298b6da49aadfd477a06a8f69eadf47c8bf9f3d6ad9` | 交易所管理 |

### 錯誤的初始配置

最初在 [backend/.env](../backend/.env) 中錯誤地將以下 Object ID 配置為 AdminCap：

- `0x51c63447...` → 實際上是 **Publisher** 物件
- `0x99f72569...` → 實際上是 **UpgradeCap** 物件

這導致了類型不匹配錯誤。

## 驗證修復

修復後，再次點擊「發放 Token」應該能成功執行：

1. ✅ NFT 鑄造成功
2. ✅ TaxCoin 發放成功
3. ✅ 用戶可在錢包中看到帶有動態圖片的 TaxClaimNFT

## 相關文件

- 智能合約: [tax_claim_nft.move](../blockchain/sources/tax_claim_nft.move)
- 後端服務: [sui.service.ts](../backend/src/services/sui.service.ts)
- 部署資訊: [DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md)
- 環境配置: [backend/.env](../backend/.env)

## 修復狀態

- ✅ 代碼已修復
- ✅ 後端已重啟
- ✅ 可以進行測試

**修復時間**: 2025-10-24
**修復人**: Claude Code Agent
