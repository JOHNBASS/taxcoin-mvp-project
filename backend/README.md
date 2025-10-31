# TAXCOIN Backend API

> Node.js + Express + TypeScript + Prisma ORM 後端服務

## 🚀 快速開始

### 開發環境

```bash
# 安裝依賴
npm install

# 生成 Prisma Client
npm run prisma:generate

# 執行資料庫 migration
npm run prisma:migrate

# 填入種子資料
npm run prisma:seed

# 啟動開發伺服器
npm run dev
```

### 生產環境 (Docker)

```bash
# 在專案根目錄執行
./scripts/start-all.sh
```

## 📁 專案結構

```
backend/
├── src/
│   ├── config/           # 配置管理
│   │   └── index.ts      # 環境變數驗證 (Zod)
│   ├── controllers/      # 控制器層
│   ├── routes/           # 路由定義
│   │   └── health.routes.ts
│   ├── services/         # 業務邏輯層
│   ├── middlewares/      # 中間件
│   │   └── errorHandler.ts
│   ├── utils/            # 工具函數
│   │   ├── logger.ts     # Winston 日誌
│   │   ├── errors.ts     # 自定義錯誤
│   │   └── prisma.ts     # Prisma Client
│   ├── types/            # TypeScript 型別
│   │   └── index.ts
│   └── server.ts         # 應用入口
├── prisma/
│   ├── schema.prisma     # 資料庫 Schema
│   └── seed.ts           # 種子資料
└── package.json
```

## 🗄️ 資料庫管理

### Prisma 常用指令

```bash
# 生成 Prisma Client
npm run prisma:generate

# 創建新 migration
npm run prisma:migrate

# 查看資料庫 (GUI)
npm run prisma:studio

# 執行種子資料
npm run prisma:seed

# 重置資料庫 (⚠️ 刪除所有資料)
npx prisma migrate reset
```

### Schema 變更流程

1. 修改 `prisma/schema.prisma`
2. 執行 `npm run prisma:migrate` 創建 migration
3. Migration 自動套用並生成新的 Client

## 🔐 環境變數

必須設置的環境變數 (參考 `.env.example`):

```env
# 資料庫
DATABASE_URL=postgresql://user:password@localhost:5432/taxcoin

# JWT
JWT_SECRET=your-32-char-secret-key-here
JWT_EXPIRES_IN=7d

# Gemini AI (可選)
GEMINI_API_KEY=your-api-key

# Sui 區塊鏈 (可選)
SUI_PRIVATE_KEY=your-private-key
SUI_TAXCOIN_PACKAGE_ID=0x...
SUI_RWA_POOL_PACKAGE_ID=0x...
```

## 📡 API 端點

### 健康檢查

```http
GET /api/v1/health
```

**回應:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-10-18T...",
    "service": "TAXCOIN Backend API",
    "version": "1.0.0"
  }
}
```

### API 文件

- Swagger 文件: `/api/docs` (未來實作)

## 🧪 測試

```bash
# 執行單元測試
npm test

# 監聽模式
npm run test:watch

# 測試覆蓋率
npm run test:coverage
```

## 📊 資料模型

### 核心實體

1. **User** - 使用者 (旅客/投資者/管理員)
2. **KycRecord** - KYC 驗證記錄
3. **TaxClaim** - 退稅申請
4. **TaxClaimNft** - 退稅債權 NFT
5. **RwaPool** - RWA 投資池
6. **Investment** - 投資記錄
7. **Notification** - 通知
8. **AuditLog** - 審計日誌

詳細資料模型: [data-model.md](../.specify/features/taxcoin-mvp-platform/data-model.md)

## 🛠️ 開發工具

### 程式碼品質

```bash
# ESLint 檢查
npm run lint

# Prettier 格式化
npm run format

# TypeScript 型別檢查
npm run type-check
```

### 日誌查看

開發環境日誌輸出到控制台。生產環境日誌儲存在:
- `logs/error.log` - 錯誤日誌
- `logs/combined.log` - 所有日誌

## 🔧 故障排除

### Prisma Client 未生成

```bash
npm run prisma:generate
```

### Migration 失敗

```bash
# 查看 migration 狀態
npx prisma migrate status

# 重置並重新執行
npx prisma migrate reset
```

### 資料庫連接失敗

1. 檢查 `DATABASE_URL` 是否正確
2. 確認 PostgreSQL 正在運行
3. 檢查網路連接

```bash
# 測試資料庫連接
npx prisma db push
```

## 📚 相關文件

- [API 規格](../.specify/features/taxcoin-mvp-platform/contracts/)
- [技術計劃](../.specify/features/taxcoin-mvp-platform/plan.md)
- [專案憲章](../.specify/memory/constitution.md)

---

**版本**: 1.0.0
**Node.js**: 20 LTS
**最後更新**: 2025-10-18
