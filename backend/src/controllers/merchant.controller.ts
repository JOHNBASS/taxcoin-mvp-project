/**
 * 店家控制器
 * 處理店家相關的 HTTP 請求
 */

import { Response } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware.js';
import * as merchantService from '@/services/merchant.service.js';
import { logger } from '@/utils/logger.js';
import { ValidationError } from '@/utils/errors.js';
import { MerchantStatus } from '@prisma/client';

/**
 * 創建店家
 * POST /api/merchants
 */
export const createMerchant = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const {
    merchantName,
    taxId,
    ownerName,
    phone,
    address,
    businessType,
    walletAddress,
  } = req.body;

  // 驗證必要欄位
  if (!merchantName || !taxId || !ownerName || !phone || !address || !businessType || !walletAddress) {
    throw new ValidationError('缺少必要欄位');
  }

  logger.info('創建店家請求', { userId, merchantName });

  const merchant = await merchantService.createMerchant(userId, {
    merchantName,
    taxId,
    ownerName,
    phone,
    address,
    businessType,
    walletAddress,
  });

  return res.status(201).json({
    success: true,
    data: { merchant },
  });
};

/**
 * 獲取店家詳情
 * GET /api/merchants/:id
 */
export const getMerchant = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) throw new ValidationError("缺少店家 ID");

  logger.info('獲取店家詳情', { merchantId });

  const merchant = await merchantService.getMerchantById(merchantId);

  return res.json({
    success: true,
    data: { merchant },
  });
};

/**
 * 獲取當前用戶的店家
 * GET /api/merchants/my/profile
 */
export const getMyMerchant = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");

  logger.info('獲取當前用戶店家', { userId });

  const merchant = await merchantService.getMerchantByUserId(userId);

  return res.json({
    success: true,
    data: { merchant },
  });
};

/**
 * 更新店家資料
 * PUT /api/merchants/:id
 */
export const updateMerchant = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) throw new ValidationError("缺少店家 ID");
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const {
    merchantName,
    phone,
    address,
    businessType,
    walletAddress,
  } = req.body;

  logger.info('更新店家資料', { merchantId, userId });

  const merchant = await merchantService.updateMerchant(merchantId, userId, {
    merchantName,
    phone,
    address,
    businessType,
    walletAddress,
  });

  return res.json({
    success: true,
    data: { merchant },
  });
};

/**
 * 獲取店家統計資料
 * GET /api/merchants/:id/stats
 */
export const getMerchantStats = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) throw new ValidationError("缺少店家 ID");

  logger.info('獲取店家統計', { merchantId });

  const stats = await merchantService.getMerchantStats(merchantId);

  return res.json({
    success: true,
    data: { stats },
  });
};

/**
 * 獲取所有店家列表（管理員用）
 * GET /api/merchants
 */
export const getAllMerchants = async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as MerchantStatus | undefined;

  logger.info('獲取店家列表', { page, limit, status });

  const result = await merchantService.getAllMerchants({
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
 * 更新店家狀態（管理員用）
 * PATCH /api/merchants/:id/status
 */
export const updateMerchantStatus = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.id;
  if (!merchantId) throw new ValidationError("缺少店家 ID");
  const { status } = req.body;

  if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
    throw new ValidationError('無效的狀態值');
  }

  logger.info('更新店家狀態', { merchantId, status });

  const merchant = await merchantService.updateMerchantStatus(merchantId, status);

  return res.json({
    success: true,
    data: { merchant },
  });
};
