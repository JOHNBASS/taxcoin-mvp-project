#!/bin/bash
set -e

echo "🔧 Adding proper userId validation in controllers..."

# The pattern: Change `const userId = req.user!.userId;` to proper null check
# Then use userId directly in service calls

# For invoice.controller.ts
cat > /tmp/invoice_fix.txt << 'EOF'
export const getMyInvoices = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new ValidationError('用戶未認證');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  logger.info('獲取當前用戶發票列表', { userId, page, limit });

  const result = await invoiceService.getCustomerInvoices(userId, {
    page,
    limit,
  });
EOF

# For merchant.controller.ts - getMerchant function
cat > /tmp/merchant_getmerchant_fix.txt << 'EOF'
export const getMerchant = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) {
    throw new ValidationError('缺少店家 ID');
  }

  logger.info('獲取店家詳情', { merchantId });

  const merchant = await merchantService.getMerchantById(merchantId);
EOF

# For merchant.controller.ts - updateMerchant function
cat > /tmp/merchant_update_fix.txt << 'EOF'
export const updateMerchant = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  const userId = req.user?.userId;

  if (!merchantId) {
    throw new ValidationError('缺少店家 ID');
  }
  if (!userId) {
    throw new ValidationError('用戶未認證');
  }

  const {
    merchantName,
    phone,
    address,
    businessType,
    walletAddress,
  } = req.body;

  logger.info('更新店家資料', { merchantId, userId });

  const merchant = await merchantService.updateMerchant(merchantId, userId, {
EOF

echo "✅ Manual fixes needed - creating comprehensive fix script..."

# Create a sed-based fix for simpler cases
cat > /tmp/fix_userid.sh << 'FIXSCRIPT'
#!/bin/bash

# Fix pattern: Add null check after userId declaration
for file in src/controllers/{invoice,merchant,payment,product}.controller.ts; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Add validation after userId assignment if not already present
    # This is a simplified approach - we'll need manual fixes for complex cases
    sed -i '' 's/const userId = req.user!.userId;/const userId = req.user?.userId;\
  if (!userId) throw new ValidationError("用戶未認證");/g' "$file"

    # Fix req.params.id cases
    sed -i '' 's/const merchantId = req.params.id;/const merchantId = req.params.id;\
  if (!merchantId) throw new ValidationError("缺少店家 ID");/g' "$file"

    sed -i '' 's/const productId = req.params.id;/const productId = req.params.id;\
  if (!productId) throw new ValidationError("缺少商品 ID");/g' "$file"

    sed -i '' 's/const paymentId = req.params.id;/const paymentId = req.params.id;\
  if (!paymentId) throw new ValidationError("缺少支付 ID");/g' "$file"

    sed -i '' 's/const invoiceId = req.params.id;/const invoiceId = req.params.id;\
  if (!invoiceId) throw new ValidationError("缺少發票 ID");/g' "$file"
  fi
done
FIXSCRIPT

chmod +x /tmp/fix_userid.sh
bash /tmp/fix_userid.sh

echo "✅ Basic fixes applied. Checking result..."
