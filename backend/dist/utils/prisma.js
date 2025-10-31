import { PrismaClient } from '@prisma/client';
import { logger } from './logger';
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
});
prisma
    .$connect()
    .then(() => {
    logger.info('✅ 資料庫連接成功');
})
    .catch((error) => {
    logger.error('❌ 資料庫連接失敗', { error });
    process.exit(1);
});
process.on('beforeExit', async () => {
    await prisma.$disconnect();
    logger.info('📪 資料庫連接已關閉');
});
export { prisma };
//# sourceMappingURL=prisma.js.map