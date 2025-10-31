import { Router, Request, Response } from 'express';
import { ApiResponse } from '@/types/index.js';
import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';

const router = Router();

/**
 * 基本健康檢查端點
 * GET /health
 */
router.get('/health', (_req: Request, res: Response) => {
  const response: ApiResponse = {
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

/**
 * 詳細健康檢查端點 (包含依賴服務)
 * GET /health/detailed
 */
router.get('/health/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    service: 'TAXCOIN Backend API',
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // 資料庫健康檢查
  try {
    // MongoDB: 使用簡單的 findFirst 來測試連接
    await prisma.user.findFirst();
    checks.database = {
      status: 'healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('資料庫健康檢查失敗', { error });
    checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // 記憶體使用
  const memUsage = process.memoryUsage();
  checks.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
  };

  // CPU 使用
  const cpuUsage = process.cpuUsage();
  checks.cpu = {
    user: `${Math.round(cpuUsage.user / 1000)} ms`,
    system: `${Math.round(cpuUsage.system / 1000)} ms`,
  };

  // 判斷整體健康狀態
  const isHealthy = checks.database?.status === 'healthy';
  const statusCode = isHealthy ? 200 : 503;

  const response: ApiResponse = {
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      totalResponseTime: `${Date.now() - startTime} ms`,
    },
  };

  return res.status(statusCode).json(response);
});

/**
 * 就緒檢查端點 (Kubernetes readiness probe)
 * GET /health/ready
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    // 檢查資料庫連接 - MongoDB 使用 findFirst
    await prisma.user.findFirst();

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('就緒檢查失敗', { error });
    return res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * 存活檢查端點 (Kubernetes liveness probe)
 * GET /health/live
 */
router.get('/health/live', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
