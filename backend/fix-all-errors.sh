#!/bin/bash
set -e

echo "🔧 Fixing all compilation errors..."

# Fix 1: Change @/middleware/ to @/middlewares/ in all files
echo "1. Fixing middleware path..."
find src/controllers src/routes -name "*.ts" -exec sed -i '' 's|@/middleware/|@/middlewares/|g' {} \;

# Fix 2: Fix ErrorCode imports in services and controllers
echo "2. Fixing ErrorCode imports..."

# For services (merchant, product, payment, invoice)
for file in src/services/{merchant,product,payment,invoice}.service.ts; do
  if [ -f "$file" ]; then
    # Remove ErrorCode from @/utils/errors.js
    sed -i '' 's/import { BusinessError, ErrorCode } from/import { BusinessError } from/g' "$file"
    sed -i '' 's/import { BusinessError, ValidationError, ErrorCode } from/import { BusinessError, ValidationError } from/g' "$file"

    # Add ErrorCode from @/types/index.js if not already there
    if ! grep -q "import.*ErrorCode.*@/types/index.js" "$file"; then
      sed -i '' "/import { BusinessError/a\\
import { ErrorCode } from '@/types/index.js';
" "$file"
    fi
  fi
done

# For controllers (merchant, product, payment, invoice)
for file in src/controllers/{merchant,product,payment,invoice}.controller.ts; do
  if [ -f "$file" ]; then
    # Remove ErrorCode from @/utils/errors.js
    sed -i '' 's/import { ValidationError, ErrorCode } from/import { ValidationError } from/g' "$file"
    sed -i '' 's/import { BusinessError, ErrorCode } from/import { BusinessError } from/g' "$file"

    # Add ErrorCode to @/types/index.js import if not already there
    if grep -q "import.*@/types/index.js" "$file"; then
      # Add ErrorCode to existing import
      sed -i '' "s/import { AuthRequest } from '@\/types\/index.js';/import { AuthRequest, ErrorCode } from '@\/types\/index.js';/g" "$file"
    fi
  fi
done

# Fix 3: Remove unused imports
echo "3. Removing unused imports..."
sed -i '' '/^import type { PaymentItem } from/d' src/controllers/payment.controller.ts
sed -i '' 's/import { BusinessError, ValidationError } from/import { BusinessError } from/g' src/services/merchant.service.ts
sed -i '' '/ConfirmPaymentDto,/d' src/services/payment.service.ts
sed -i '' '/InvoiceItem,/d' src/services/invoice.service.ts
sed -i '' '/VoidInvoiceDto,/d' src/services/invoice.service.ts

# Fix 4: Fix type conversions (add 'as unknown as' for Prisma JsonValue)
echo "4. Fixing type conversions..."

# Fix invoice.service.ts
sed -i '' 's/return invoice as Invoice;/return invoice as unknown as Invoice;/g' src/services/invoice.service.ts
sed -i '' 's/return updatedInvoice as Invoice;/return updatedInvoice as unknown as Invoice;/g' src/services/invoice.service.ts
sed -i '' 's/invoices as Invoice\[\]/invoices as unknown as Invoice[]/g' src/services/invoice.service.ts

# Fix payment.service.ts (already fixed but double check)
sed -i '' 's/payment as Payment/payment as unknown as Payment/g' src/services/payment.service.ts
sed -i '' 's/updatedPayment as Payment/updatedPayment as unknown as Payment/g' src/services/payment.service.ts
sed -i '' 's/payments as Payment\[\]/payments as unknown as Payment[]/g' src/services/payment.service.ts
sed -i '' 's/items as PaymentItem\[\]/items as unknown as PaymentItem[]/g' src/services/payment.service.ts

echo "✅ All fixes applied!"
echo ""
echo "Running compilation check..."
npx tsc --noEmit 2>&1 | tail -30
