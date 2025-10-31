import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taxClaimRoutes from './routes/taxClaim.routes.js';
import rwaPoolRoutes from './routes/rwaPool.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';
import { startScheduler, stopScheduler } from './services/scheduler.service.js';
const app = express();
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        query: req.query,
        ip: req.ip,
    });
    next();
});
app.get('/', (_req, res) => {
    res.json({
        success: true,
        data: {
            message: 'TAXCOIN Backend API',
            version: '1.0.0',
            docs: '/api/docs',
        },
    });
});
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tax-claims', taxClaimRoutes);
app.use('/api/v1/rwa-pools', rwaPoolRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/reports', reportRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
const startServer = async () => {
    try {
        await prisma.$runCommandRaw({ ping: 1 });
        logger.info('✅ 資料庫連接測試通過');
        startScheduler();
        logger.info('✅ 定時任務調度器已啟動');
        app.listen(config.port, () => {
            logger.info(`🚀 伺服器啟動成功`);
            logger.info(`📍 環境: ${config.nodeEnv}`);
            logger.info(`🌐 Port: ${config.port}`);
            logger.info(`📡 CORS Origin: ${config.corsOrigin}`);
            logger.info(`✅ 健康檢查: http://localhost:${config.port}/api/v1/health`);
        });
    }
    catch (error) {
        logger.error('❌ 伺服器啟動失敗', { error });
        process.exit(1);
    }
};
process.on('SIGTERM', async () => {
    logger.info('收到 SIGTERM 信號,正在關閉伺服器...');
    stopScheduler();
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger.info('收到 SIGINT 信號,正在關閉伺服器...');
    stopScheduler();
    await prisma.$disconnect();
    process.exit(0);
});
process.on('unhandledRejection', (reason) => {
    logger.error('未處理的 Promise Rejection:', { reason });
});
process.on('uncaughtException', (error) => {
    logger.error('未捕獲的異常:', { error });
    process.exit(1);
});
startServer();
export default app;
//# sourceMappingURL=server.js.map