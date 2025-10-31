import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
const router = Router();
router.get('/health', (_req, res) => {
    const response = {
        success: true,
        data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'TAXCOIN Backend API',
            version: '1.0.0',
            uptime: process.uptime(),
        },
    };
    return res.json(response);
});
router.get('/health/detailed', async (_req, res) => {
    const startTime = Date.now();
    const checks = {
        timestamp: new Date().toISOString(),
        service: 'TAXCOIN Backend API',
        version: '1.0.0',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    };
    try {
        await prisma.user.findFirst();
        checks.database = {
            status: 'healthy',
            responseTime: Date.now() - startTime,
        };
    }
    catch (error) {
        logger.error('資料庫健康檢查失敗', { error });
        checks.database = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    const memUsage = process.memoryUsage();
    checks.memory = {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
    };
    const cpuUsage = process.cpuUsage();
    checks.cpu = {
        user: `${Math.round(cpuUsage.user / 1000)} ms`,
        system: `${Math.round(cpuUsage.system / 1000)} ms`,
    };
    const isHealthy = checks.database?.status === 'healthy';
    const statusCode = isHealthy ? 200 : 503;
    const response = {
        success: isHealthy,
        data: {
            status: isHealthy ? 'healthy' : 'unhealthy',
            checks,
            totalResponseTime: `${Date.now() - startTime} ms`,
        },
    };
    return res.status(statusCode).json(response);
});
router.get('/health/ready', async (_req, res) => {
    try {
        await prisma.user.findFirst();
        return res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        logger.error('就緒檢查失敗', { error });
        return res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/health/live', (_req, res) => {
    return res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
export default router;
//# sourceMappingURL=health.routes.js.map