// 測試投資計數查詢
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mongodb://localhost:27017/taxcoin'
    }
  }
});

async function test() {
  console.log('🔍 開始測試投資計數...\n');

  // 1. 查詢所有投資記錄
  const investments = await prisma.investment.findMany({
    select: {
      id: true,
      poolId: true,
      userId: true,
      investmentAmount: true,
    }
  });

  console.log(`✅ 找到 ${investments.length} 筆投資記錄`);
  investments.forEach((inv) => {
    console.log(`  - Pool: ${inv.poolId}, Amount: ${inv.investmentAmount}`);
  });

  // 2. 查詢投資池（包含計數）
  const pools = await prisma.rwaPool.findMany({
    include: {
      _count: {
        select: {
          items: true,
          investments: true,
        },
      },
    },
  });

  console.log(`\n✅ 找到 ${pools.length} 個投資池`);
  pools.forEach((pool) => {
    console.log(`\nPool: ${pool.poolName} (${pool.id})`);
    console.log(`  - 投資人數(_count.investments): ${pool._count.investments}`);
    console.log(`  - 項目數(_count.items): ${pool._count.items}`);
    console.log(`  - 當前金額: ${pool.currentAmount}`);
    console.log(`  - 狀態: ${pool.status}`);
  });

  // 3. 手動計數驗證
  for (const pool of pools) {
    const count = await prisma.investment.count({
      where: { poolId: pool.id }
    });
    console.log(`\n手動計數 Pool ${pool.poolName}: ${count} 筆投資`);
  }

  await prisma.$disconnect();
}

test().catch((error) => {
  console.error('❌ 測試失敗:', error);
  process.exit(1);
});
