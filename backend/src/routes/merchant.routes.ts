/**
 * 店家路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import * as merchantController from '@/controllers/merchant.controller.js';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要身份驗證
router.use(authenticate);

/**
 * 創建店家
 * POST /api/merchants
 * 權限: MERCHANT
 */
router.post(
  '/',
  authorize(UserRole.MERCHANT),
  asyncHandler(merchantController.createMerchant)
);

/**
 * 獲取當前用戶的店家
 * GET /api/merchants/my/profile
 * 權限: MERCHANT
 */
router.get(
  '/my/profile',
  authorize(UserRole.MERCHANT),
  asyncHandler(merchantController.getMyMerchant)
);

/**
 * 獲取所有店家列表（管理員用）
 * GET /api/merchants
 * 權限: ADMIN
 */
router.get(
  '/',
  authorize(UserRole.ADMIN),
  asyncHandler(merchantController.getAllMerchants)
);

/**
 * 獲取店家詳情
 * GET /api/merchants/:id
 * 權限: MERCHANT, ADMIN
 */
router.get(
  '/:id',
  authorize(UserRole.MERCHANT, UserRole.ADMIN),
  asyncHandler(merchantController.getMerchant)
);

/**
 * 更新店家資料
 * PUT /api/merchants/:id
 * 權限: MERCHANT
 */
router.put(
  '/:id',
  authorize(UserRole.MERCHANT),
  asyncHandler(merchantController.updateMerchant)
);

/**
 * 獲取店家統計資料
 * GET /api/merchants/:id/stats
 * 權限: MERCHANT, ADMIN
 */
router.get(
  '/:id/stats',
  authorize(UserRole.MERCHANT, UserRole.ADMIN),
  asyncHandler(merchantController.getMerchantStats)
);

/**
 * 更新店家狀態（管理員用）
 * PATCH /api/merchants/:id/status
 * 權限: ADMIN
 */
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN),
  asyncHandler(merchantController.updateMerchantStatus)
);

export default router;
