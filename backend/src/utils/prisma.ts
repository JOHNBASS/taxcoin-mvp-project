import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// 創建 Prisma Client 實例
// 開發環境啟用查詢日誌
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
});

// 連接資料庫
prisma
  .$connect()
  .then(() => {
    logger.info('✅ 資料庫連接成功');
  })
  .catch((error) => {
    logger.error('❌ 資料庫連接失敗', { error });
    process.exit(1);
  });

// 優雅關閉
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('📪 資料庫連接已關閉');
});

export { prisma };
