import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { prisma } from '@/utils/prisma.js';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler.js';
import healthRoutes from '@/routes/health.routes.js';
import authRoutes from '@/routes/auth.routes.js';
import userRoutes from '@/routes/user.routes.js';
import taxClaimRoutes from '@/routes/taxClaim.routes.js';
import rwaPoolRoutes from '@/routes/rwaPool.routes.js';
import kycRoutes from '@/routes/kyc.routes.js';
import dashboardRoutes from '@/routes/dashboard.routes.js';
import reportRoutes from '@/routes/report.routes.js';
import nftRoutes from '@/routes/nft.routes.js';
import investmentRoutes from '@/routes/investment.routes.js';
import exchangeRoutes from '@/routes/exchange.routes.js';
import merchantRoutes from '@/routes/merchant.routes.js';
import productRoutes from '@/routes/product.routes.js';
import paymentRoutes from '@/routes/payment.routes.js';
import invoiceRoutes from '@/routes/invoice.routes.js';
import { startScheduler, stopScheduler } from '@/services/scheduler.service.js';

// 創建 Express 應用
const app = express();

// ===== 中間件設置 =====

// 安全性中間件
app.use(helmet());

// CORS 設置 - 支援多個來源（生產環境優先）
const allowedOrigins = [
  'https://taxcoin-mvp.transferhelper.com.tw', // 生產環境（主要）
  'http://localhost:5004',                      // 本地前端
  'http://localhost:5003',                      // 本地後端
];

app.use(
  cors({
    origin: (origin, callback) => {
      // 允許沒有 origin 的請求（如 Postman、curl、同源請求）
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS 被拒絕', { origin, allowedOrigins });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Body 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 靜態檔案服務 - 提供上傳的檔案（添加 CORS headers）
app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  // 動態設置 CORS header，支援多個來源
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0]); // 預設使用生產環境
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(config.upload.uploadDir));

// 請求日誌
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// ===== 路由設置 =====

// API 根路徑
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

// v1 API 路由
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tax-claims', taxClaimRoutes);
app.use('/api/v1/rwa-pools', rwaPoolRoutes);
app.use('/api/v1/investments', investmentRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/admin/dashboard', dashboardRoutes);
app.use('/api/v1/admin/reports', reportRoutes);
app.use('/api/v1/nft', nftRoutes);
app.use('/api/v1/exchange', exchangeRoutes);

// QR Code 支付功能路由
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/invoices', invoiceRoutes);

// ===== 錯誤處理 =====

// 404 處理
app.use(notFoundHandler);

// 統一錯誤處理
app.use(errorHandler);

// ===== 啟動伺服器 =====

const startServer = async () => {
  try {
    // 測試資料庫連接 - MongoDB 使用 $runCommandRaw
    await prisma.$runCommandRaw({ ping: 1 });
    logger.info('✅ 資料庫連接測試通過');

    // 啟動定時任務調度器
    startScheduler();
    logger.info('✅ 定時任務調度器已啟動');

    app.listen(config.port, () => {
      logger.info(`🚀 伺服器啟動成功`);
      logger.info(`📍 環境: ${config.nodeEnv}`);
      logger.info(`🌐 Port: ${config.port}`);
      logger.info(`📡 CORS Origin: ${config.corsOrigin}`);
      logger.info(`✅ 健康檢查: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    logger.error('❌ 伺服器啟動失敗', { error });
    process.exit(1);
  }
};

// 優雅關閉
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

// 未捕獲的錯誤處理
process.on('unhandledRejection', (reason) => {
  logger.error('未處理的 Promise Rejection:', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('未捕獲的異常:', { error });
  process.exit(1);
});

// 啟動
startServer();

export default app;
