#!/bin/bash
# 修復 QR Code 支付功能的編譯錯誤

cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp/backend/src

echo "修復中間件路徑..."
# 修復 controllers 和 routes 中的中間件路徑
find controllers routes -name "*.ts" -exec sed -i '' 's|@/middleware/|@/middlewares/|g' {} \;
find routes -name "*.ts" -exec sed -i '' 's|@/middlewares/error.middleware.js|@/middlewares/errorHandler.js|g' {} \;

echo "修復 ErrorCode 導入..."
# 修復所有文件中的 ErrorCode 導入
for file in controllers/*.controller.ts services/merchant.service.ts services/product.service.ts services/payment.service.ts services/invoice.service.ts; do
  if [ -f "$file" ]; then
    # 檢查是否已經有從 @/types/index.js 導入的 ErrorCode
    if ! grep -q "import { ErrorCode } from '@/types/index.js'" "$file"; then
      # 在 errors 導入後添加 ErrorCode 導入
      sed -i '' "/import.*from '@\/utils\/errors.js'/a\\
import { ErrorCode } from '@/types/index.js';
" "$file"
    fi
  fi
done

echo "修復類型轉換..."
# 修復 payment.service.ts 和 invoice.service.ts 的類型轉換
sed -i '' 's/return payment as Payment;/return payment as unknown as Payment;/g' services/payment.service.ts
sed -i '' 's/payments as Payment\[\]/payments as unknown as Payment[]/g' services/payment.service.ts
sed -i '' 's/return invoice as Invoice;/return invoice as unknown as Invoice;/g' services/invoice.service.ts
sed -i '' 's/: invoices as Invoice\[\]/: invoices as unknown as Invoice[]/g' services/invoice.service.ts

# 修復 JsonValue 轉換問題
sed -i '' 's/items: payment.items,/items: payment.items as any,/g' services/invoice.service.ts
sed -i '' 's/const items = payment.items as PaymentItem\[\];/const items = payment.items as unknown as PaymentItem[];/g' services/payment.service.ts

echo "移除未使用的導入..."
# 移除未使用的導入
sed -i '' 's/, ValidationError//g' services/merchant.service.ts
sed -i '' '/import type {.*ConfirmPaymentDto/d' services/payment.service.ts
sed -i '' '/^import type {.*PaymentItem.*from.*payment.controller/d' controllers/payment.controller.ts

echo "修復 Invoice 類型導入..."
# 確保 invoice.service.ts 有 Invoice 類型導入
if ! grep -q "import type { Invoice } from" services/invoice.service.ts; then
  sed -i '' "10a\\
import type { Invoice } from '@/types/payment.types.js';
" services/invoice.service.ts
fi

echo "完成！"
