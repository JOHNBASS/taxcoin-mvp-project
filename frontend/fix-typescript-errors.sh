#!/bin/bash

cd /Users/john_c_chang/Documents/POC/SpecKit_test/taxcoin-mvp/frontend

echo "=== Fixing ProductCard.tsx ==="
# Fix: Use ProductStatus enum instead of string literal
sed -i '' 's|onToggleStatus?.(product.id, isActive ? '\''INACTIVE'\'' : '\''ACTIVE'\'')|onToggleStatus?.(product.id, isActive ? ProductStatus.INACTIVE : ProductStatus.ACTIVE)|g' src/components/payment/ProductCard.tsx

echo "=== Fixing ProductManagementPage.tsx ==="
# Fix: Use ProductStatus enum instead of string literal
sed -i '' 's|product.id, isActive ? '\''INACTIVE'\'' : '\''ACTIVE'\''|product.id, isActive ? ProductStatus.INACTIVE : ProductStatus.ACTIVE|g' src/pages/merchant/ProductManagementPage.tsx

echo "=== Fixing QRCodeGeneratorPage.tsx ==="
# Fix: Use ProductStatus enum instead of string literal
sed -i '' 's|status: '\''ACTIVE'\'',|status: ProductStatus.ACTIVE,|g' src/pages/merchant/QRCodeGeneratorPage.tsx

echo "=== Fixing PaymentConfirmPage.tsx ==="
# Fix: Change import from @mysten/sui.js to @mysten/sui
sed -i '' 's|@mysten/sui.js/transactions|@mysten/sui/transactions|g' src/pages/customer/PaymentConfirmPage.tsx

echo "=== Fixing MerchantRegisterPage.tsx ==="
# Fix: Change wallet.connect() to if (!wallet.connected) return
# This is more complex, will need manual fix
echo "Note: MerchantRegisterPage.tsx wallet.connect() needs manual review"

echo "=== Fixes completed ==="
