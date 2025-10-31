/**
 * 投資相關路由
 */

import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { UserRole } from '@/types/index.js';
import {
  buildInvestmentTransaction,
  confirmInvestment,
} from '@/controllers/investment.controller.js';

const router = Router();

// 所有投資路由都需要認證
router.use(authenticate);

/**
 * 構建投資交易（前端簽名用）
 * POST /api/v1/investments/build-tx
 */
router.post(
  '/build-tx',
  authorize(UserRole.INVESTOR),
  asyncHandler(buildInvestmentTransaction)
);

/**
 * 確認投資（前端簽名後調用）
 * POST /api/v1/investments/confirm
 */
router.post(
  '/confirm',
  authorize(UserRole.INVESTOR),
  asyncHandler(confirmInvestment)
);

export default router;
