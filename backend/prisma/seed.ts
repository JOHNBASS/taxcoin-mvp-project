import { PrismaClient, UserRole, KycStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始執行資料庫種子資料...');

  // 清空現有資料 (僅開發環境)
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  清空現有資料...');
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.rwaPoolItem.deleteMany();
    await prisma.rwaPool.deleteMany();
    await prisma.taxClaimNft.deleteMany();
    await prisma.taxClaim.deleteMany();
    await prisma.kycRecord.deleteMany();
    await prisma.user.deleteMany();
    await prisma.systemConfig.deleteMany();
  }

  // 創建測試使用者
  console.log('👤 創建測試使用者...');

  // 1. 管理員帳號
  const admin = await prisma.user.create({
    data: {
      did: 'did:sui:admin001',
      role: UserRole.ADMIN,
      kycStatus: KycStatus.VERIFIED,
      walletAddress: '0xadmin000000000000000000000000000000000001',
      email: 'admin@taxcoin.tw',
    },
  });
  console.log(`✅ 創建管理員: ${admin.email}`);

  // 2. 旅客測試帳號
  const tourist1 = await prisma.user.create({
    data: {
      did: 'did:sui:tourist001',
      role: UserRole.TOURIST,
      kycStatus: KycStatus.VERIFIED,
      walletAddress: '0xtourist0000000000000000000000000000001',
      email: 'tourist1@example.com',
      kycRecords: {
        create: {
          passportNumber: 'P12345678',
          passportImageUrl: '/uploads/passport/tourist1.jpg',
          faceImageUrl: '/uploads/face/tourist1.jpg',
          nationality: 'JP',
          dateOfBirth: new Date('1990-01-15'),
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log(`✅ 創建旅客1: ${tourist1.email} (KYC已驗證)`);

  const tourist2 = await prisma.user.create({
    data: {
      did: 'did:sui:tourist002',
      role: UserRole.TOURIST,
      kycStatus: KycStatus.PENDING,
      walletAddress: '0xtourist0000000000000000000000000000002',
      email: 'tourist2@example.com',
    },
  });
  console.log(`✅ 創建旅客2: ${tourist2.email} (KYC待驗證)`);

  // 3. 投資者測試帳號
  const investor1 = await prisma.user.create({
    data: {
      did: 'did:sui:investor001',
      role: UserRole.INVESTOR,
      kycStatus: KycStatus.VERIFIED,
      walletAddress: '0xinvestor000000000000000000000000000001',
      email: 'investor1@example.com',
      kycRecords: {
        create: {
          passportNumber: 'I98765432',
          passportImageUrl: '/uploads/passport/investor1.jpg',
          faceImageUrl: '/uploads/face/investor1.jpg',
          nationality: 'TW',
          dateOfBirth: new Date('1985-05-20'),
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log(`✅ 創建投資者1: ${investor1.email} (KYC已驗證)`);

  // 創建測試退稅申請
  console.log('🧾 創建測試退稅申請...');

  const taxClaim1 = await prisma.taxClaim.create({
    data: {
      userId: tourist1.id,
      receiptImages: ['/uploads/receipts/receipt1.jpg'],
      ocrResult: {
        merchantName: '台北101購物中心',
        purchaseDate: '2025-10-15',
        totalAmount: 10000,
        items: [
          { name: '精品包', quantity: 1, price: 10000 },
        ],
        confidence: 0.95,
      },
      originalAmount: 10000,
      taxAmount: 500,
      taxCoinAmount: 500,
      status: 'APPROVED',
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });
  console.log(`✅ 創建退稅申請1: NT$${taxClaim1.taxAmount}`);

  const taxClaim2 = await prisma.taxClaim.create({
    data: {
      userId: tourist1.id,
      receiptImages: ['/uploads/receipts/receipt2.jpg'],
      ocrResult: {
        merchantName: '微風廣場',
        purchaseDate: '2025-10-16',
        totalAmount: 5000,
        items: [
          { name: '化妝品', quantity: 2, price: 2500 },
        ],
        confidence: 0.92,
      },
      originalAmount: 5000,
      taxAmount: 250,
      taxCoinAmount: 250,
      status: 'PENDING',
    },
  });
  console.log(`✅ 創建退稅申請2: NT$${taxClaim2.taxAmount} (待審核)`);

  // 創建 RWA Pool
  console.log('💰 創建 RWA 投資池...');

  const rwaPool1 = await prisma.rwaPool.create({
    data: {
      poolName: 'RWA Pool #1 - 2025 Q4',
      targetAmount: 1000000,
      currentAmount: 0,
      yieldRate: 8.5,
      maturityDate: new Date('2025-12-31'),
      status: '募集中',
    },
  });
  console.log(`✅ 創建投資池1: ${rwaPool1.poolName} (目標: ${rwaPool1.targetAmount})`);

  // 創建系統配置
  console.log('⚙️  創建系統配置...');

  await prisma.systemConfig.create({
    data: {
      key: 'tax_rate',
      value: JSON.stringify({ rate: 0.05, description: '退稅率 5%' }),
    },
  });

  await prisma.systemConfig.create({
    data: {
      key: 'min_claim_amount',
      value: JSON.stringify({ amount: 100, currency: 'TWD' }),
    },
  });

  console.log('✅ 系統配置創建完成');

  console.log('\n🎉 種子資料執行完成!');
  console.log('\n📊 統計:');
  console.log(`  - 使用者: ${await prisma.user.count()}`);
  console.log(`  - 退稅申請: ${await prisma.taxClaim.count()}`);
  console.log(`  - RWA 投資池: ${await prisma.rwaPool.count()}`);
  console.log(`  - 系統配置: ${await prisma.systemConfig.count()}`);

  console.log('\n🔑 測試帳號:');
  console.log(`  管理員: ${admin.email}`);
  console.log(`  旅客1: ${tourist1.email} (已驗證)`);
  console.log(`  旅客2: ${tourist2.email} (待驗證)`);
  console.log(`  投資者1: ${investor1.email} (已驗證)`);
}

main()
  .catch((e) => {
    console.error('❌ 種子資料執行失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
