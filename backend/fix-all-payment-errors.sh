#!/bin/bash

# Fix all remaining payment feature TypeScript compilation errors

cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp/backend

echo "=== Fixing remaining route files (middleware paths) ==="
find src/routes -name "*.ts" -exec sed -i '' 's|@/middleware/auth.middleware.js|@/middlewares/auth.middleware.js|g' {} \;
find src/routes -name "*.ts" -exec sed -i '' 's|@/middleware/error.middleware.js|@/middlewares/error.middleware.js|g' {} \;

echo "=== Fixing service files (ErrorCode import) ==="
# Fix invoice.service.ts
sed -i '' 's|import { ErrorCode } from .*|import { ErrorCode } from "@/types/index.js";|g' src/services/invoice.service.ts
sed -i '' 's|import { BusinessError, ErrorCode, ValidationError } from .*|import { BusinessError, ValidationError } from "@/utils/errors.js";\nimport { ErrorCode } from "@/types/index.js";|g' src/services/invoice.service.ts

# Fix merchant.service.ts
sed -i '' 's|import { BusinessError, ErrorCode, ValidationError } from .*|import { BusinessError } from "@/utils/errors.js";\nimport { ErrorCode } from "@/types/index.js";|g' src/services/merchant.service.ts

# Fix payment.service.ts
sed -i '' 's|import { BusinessError, ErrorCode, ValidationError } from .*|import { BusinessError, ValidationError } from "@/utils/errors.js";\nimport { ErrorCode } from "@/types/index.js";|g' src/services/payment.service.ts

# Fix product.service.ts
sed -i '' 's|import { BusinessError, ErrorCode, ValidationError } from .*|import { BusinessError, ValidationError } from "@/utils/errors.js";\nimport { ErrorCode } from "@/types/index.js";|g' src/services/product.service.ts

echo "=== Fixing Prisma JsonValue type conversions ==="

# Fix invoice.service.ts - use 'as unknown as' pattern
sed -i '' 's|return invoice as Invoice;|return invoice as unknown as Invoice;|g' src/services/invoice.service.ts
sed -i '' 's|return invoices as Invoice\[\];|return invoices as unknown as Invoice[];|g' src/services/invoice.service.ts

# Fix payment.service.ts - use 'as unknown as' pattern
sed -i '' 's|return payment as Payment;|return payment as unknown as Payment;|g' src/services/payment.service.ts
sed -i '' 's|return payments as Payment\[\];|return payments as unknown as Payment[];|g' src/services/payment.service.ts
sed -i '' 's|const items = payment.items as PaymentItem\[\];|const items = payment.items as unknown as PaymentItem[];|g' src/services/payment.service.ts

echo "=== Removing unused imports ==="
# Remove PaymentItem from controller
sed -i '' '/^import type { PaymentItem }/d' src/controllers/payment.controller.ts

echo "=== Fixes completed ==="
echo "Please rebuild the backend container"
