/**
 * 支付控制器
 * 處理 QR Code 支付相關的 HTTP 請求
 */

import { Response } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware.js';
import * as paymentService from '@/services/payment.service.js';
import * as merchantService from '@/services/merchant.service.js';
import { logger } from '@/utils/logger.js';
import { ValidationError, BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import { PaymentStatus } from '@prisma/client';

/**
 * 生成支付 QR Code
 * POST /api/payments/qrcode
 */
export const createPaymentQRCode = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const { items } = req.body;

  // 驗證必要欄位
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('缺少商品資料');
  }

  // 驗證商品項目格式
  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ValidationError('商品資料格式錯誤');
    }
  }

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('生成支付 QR Code', { merchantId: merchant.id, itemsCount: items.length });

  const result = await paymentService.createPaymentQRCode(merchant.id, items);

  return res.status(201).json({
    success: true,
    data: result,
  });
};

/**
 * 掃描 QR Code
 * POST /api/payments/scan
 */
export const scanQRCode = async (req: AuthRequest, res: Response) => {
  const { qrCodeData } = req.body;

  if (!qrCodeData) {
    throw new ValidationError('缺少 QR Code 資料');
  }

  logger.info('掃描 QR Code');

  const result = await paymentService.scanQRCode(qrCodeData);

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 確認支付
 * POST /api/payments/:id/confirm
 */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;
  if (!paymentId) throw new ValidationError("缺少支付 ID");
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const { transactionHash } = req.body;

  if (!transactionHash) {
    throw new ValidationError('缺少交易哈希');
  }

  logger.info('確認支付', { paymentId, userId, transactionHash });

  const result = await paymentService.confirmPayment(paymentId, userId, transactionHash);

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 獲取旅客的支付記錄
 * GET /api/payments/my/history
 */
export const getMyPayments = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as PaymentStatus | undefined;

  logger.info('獲取旅客支付記錄', { userId, page, limit, status });

  const result = await paymentService.getCustomerPayments(userId, {
    page,
    limit,
    status,
  });

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 獲取店家的支付記錄
 * GET /api/payments/merchant/history
 */
export const getMerchantPayments = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as PaymentStatus | undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('獲取店家支付記錄', { merchantId: merchant.id, page, limit, status });

  const result = await paymentService.getMerchantPayments(merchant.id, {
    page,
    limit,
    status,
    startDate,
    endDate,
  });

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 獲取支付詳情
 * GET /api/payments/:id
 */
export const getPayment = async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;
  if (!paymentId) throw new ValidationError("缺少支付 ID");

  logger.info('獲取支付詳情', { paymentId });

  const payment = await paymentService.getPaymentById(paymentId);

  return res.json({
    success: true,
    data: { payment },
  });
};

/**
 * 取消支付
 * POST /api/payments/:id/cancel
 */
export const cancelPayment = async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id;
  if (!paymentId) throw new ValidationError("缺少支付 ID");

  logger.info('取消支付', { paymentId });

  const payment = await paymentService.cancelPayment(paymentId);

  return res.json({
    success: true,
    data: { payment },
  });
};

/**
 * 獲取用戶的 TaxCoin Coin 對象
 * GET /api/payments/taxcoin-objects
 */
export const getTaxCoinObjects = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");

  const walletAddress = req.query.walletAddress as string;
  if (!walletAddress) {
    throw new ValidationError('缺少錢包地址');
  }

  logger.info('📍 [Payment Controller] 獲取 TaxCoin Coin 對象', { userId, walletAddress });

  const objects = await paymentService.getTaxCoinObjects(walletAddress);

  logger.info('✅ [Payment Controller] 成功獲取並返回 TaxCoin Coin 對象', {
    userId,
    walletAddress,
    count: objects.length,
  });

  return res.json({
    success: true,
    data: { objects },
  });
};
