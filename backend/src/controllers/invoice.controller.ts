/**
 * 發票控制器
 * 處理發票相關的 HTTP 請求
 */

import { Response } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware.js';
import * as invoiceService from '@/services/invoice.service.js';
import * as merchantService from '@/services/merchant.service.js';
import { logger } from '@/utils/logger.js';
import { ValidationError, BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import { InvoiceStatus } from '@prisma/client';

/**
 * 獲取發票詳情
 * GET /api/invoices/:id
 */
export const getInvoice = async (req: AuthRequest, res: Response) => {
  const invoiceId = req.params.id;
  if (!invoiceId) throw new ValidationError("缺少發票 ID");

  logger.info('獲取發票詳情', { invoiceId });

  const invoice = await invoiceService.getInvoiceById(invoiceId);

  return res.json({
    success: true,
    data: { invoice },
  });
};

/**
 * 根據發票號碼查詢
 * GET /api/invoices/number/:invoiceNumber
 */
export const getInvoiceByNumber = async (req: AuthRequest, res: Response) => {
  const invoiceNumber = req.params.invoiceNumber;
  if (!invoiceNumber) {
    throw new ValidationError('缺少發票號碼');
  }

  logger.info('根據發票號碼查詢', { invoiceNumber });

  const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);

  return res.json({
    success: true,
    data: { invoice },
  });
};

/**
 * 獲取店家的發票列表
 * GET /api/invoices/merchant/list
 */
export const getMerchantInvoices = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as InvoiceStatus | undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('獲取店家發票列表', { merchantId: merchant.id, page, limit, status });

  const result = await invoiceService.getMerchantInvoices(merchant.id, {
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
 * 獲取旅客的發票列表
 * GET /api/invoices/my/list
 */
export const getMyInvoices = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  logger.info('獲取旅客發票列表', { userId, page, limit });

  const result = await invoiceService.getCustomerInvoices(userId, {
    page,
    limit,
  });

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 作廢發票
 * POST /api/invoices/:id/void
 */
export const voidInvoice = async (req: AuthRequest, res: Response) => {
  const invoiceId = req.params.id;
  if (!invoiceId) throw new ValidationError("缺少發票 ID");
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const { voidReason } = req.body;

  if (!voidReason) {
    throw new ValidationError('缺少作廢原因');
  }

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('作廢發票', { invoiceId, merchantId: merchant.id, voidReason });

  const invoice = await invoiceService.voidInvoice(invoiceId, merchant.id, voidReason);

  return res.json({
    success: true,
    data: { invoice },
  });
};

/**
 * 手動生成發票（管理員用）
 * POST /api/invoices/generate
 */
export const generateInvoice = async (req: AuthRequest, res: Response) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    throw new ValidationError('缺少支付 ID');
  }

  logger.info('手動生成發票', { paymentId });

  const invoice = await invoiceService.generateInvoice(paymentId);

  return res.json({
    success: true,
    data: { invoice },
  });
};
