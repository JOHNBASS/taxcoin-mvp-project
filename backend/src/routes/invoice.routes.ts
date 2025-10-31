/**
 * 發票路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import * as invoiceController from '@/controllers/invoice.controller.js';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要身份驗證
router.use(authenticate);

/**
 * 獲取旅客的發票列表
 * GET /api/invoices/my/list
 * 權限: TOURIST
 */
router.get(
  '/my/list',
  authorize(UserRole.TOURIST),
  asyncHandler(invoiceController.getMyInvoices)
);

/**
 * 獲取店家的發票列表
 * GET /api/invoices/merchant/list
 * 權限: MERCHANT
 */
router.get(
  '/merchant/list',
  authorize(UserRole.MERCHANT),
  asyncHandler(invoiceController.getMerchantInvoices)
);

/**
 * 根據發票號碼查詢
 * GET /api/invoices/number/:invoiceNumber
 * 權限: All authenticated users
 */
router.get(
  '/number/:invoiceNumber',
  asyncHandler(invoiceController.getInvoiceByNumber)
);

/**
 * 手動生成發票（管理員用）
 * POST /api/invoices/generate
 * 權限: ADMIN
 */
router.post(
  '/generate',
  authorize(UserRole.ADMIN),
  asyncHandler(invoiceController.generateInvoice)
);

/**
 * 作廢發票
 * POST /api/invoices/:id/void
 * 權限: MERCHANT
 */
router.post(
  '/:id/void',
  authorize(UserRole.MERCHANT),
  asyncHandler(invoiceController.voidInvoice)
);

/**
 * 獲取發票詳情
 * GET /api/invoices/:id
 * 權限: All authenticated users
 */
router.get(
  '/:id',
  asyncHandler(invoiceController.getInvoice)
);

export default router;
