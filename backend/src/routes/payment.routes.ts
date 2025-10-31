/**
 * 支付路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import * as paymentController from '@/controllers/payment.controller.js';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要身份驗證
router.use(authenticate);

/**
 * 生成支付 QR Code
 * POST /api/payments/qrcode
 * 權限: MERCHANT
 */
router.post(
  '/qrcode',
  authorize(UserRole.MERCHANT),
  asyncHandler(paymentController.createPaymentQRCode)
);

/**
 * 掃描 QR Code
 * POST /api/payments/scan
 * 權限: TOURIST
 */
router.post(
  '/scan',
  authorize(UserRole.TOURIST),
  asyncHandler(paymentController.scanQRCode)
);

/**
 * 獲取旅客的支付記錄
 * GET /api/payments/my/history
 * 權限: TOURIST
 */
router.get(
  '/my/history',
  authorize(UserRole.TOURIST),
  asyncHandler(paymentController.getMyPayments)
);

/**
 * 獲取店家的支付記錄
 * GET /api/payments/merchant/history
 * 權限: MERCHANT
 */
router.get(
  '/merchant/history',
  authorize(UserRole.MERCHANT),
  asyncHandler(paymentController.getMerchantPayments)
);

/**
 * 確認支付
 * POST /api/payments/:id/confirm
 * 權限: TOURIST
 */
router.post(
  '/:id/confirm',
  authorize(UserRole.TOURIST),
  asyncHandler(paymentController.confirmPayment)
);

/**
 * 獲取 TaxCoin Coin 對象
 * GET /api/payments/taxcoin-objects
 * 權限: TOURIST
 * ⚠️ 必須在 /:id 路由之前定義，否則會被匹配為 id 參數
 */
router.get(
  '/taxcoin-objects',
  authorize(UserRole.TOURIST),
  asyncHandler(paymentController.getTaxCoinObjects)
);

/**
 * 取消支付
 * POST /api/payments/:id/cancel
 * 權限: TOURIST, MERCHANT
 */
router.post(
  '/:id/cancel',
  authorize(UserRole.TOURIST, UserRole.MERCHANT),
  asyncHandler(paymentController.cancelPayment)
);

/**
 * 獲取支付詳情
 * GET /api/payments/:id
 * 權限: All authenticated users
 */
router.get(
  '/:id',
  asyncHandler(paymentController.getPayment)
);

export default router;
