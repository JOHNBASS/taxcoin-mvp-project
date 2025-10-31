import { Router } from 'express';
import * as taxClaimController from '@/controllers/taxClaim.controller.js';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { uploadMultiple, handleUploadError } from '@/middlewares/upload.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { UserRole } from '@/types/index.js';

const router = Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   POST /api/v1/tax-claims
 * @desc    創建退稅申請 (上傳收據)
 * @access  Private (TOURIST only)
 */
router.post(
  '/',
  uploadMultiple('receipts', 5), // 最多 5 張收據
  handleUploadError,
  asyncHandler(taxClaimController.createTaxClaim)
);

// ===== 管理員路由 (必須在 /:id 之前) =====

/**
 * @route   GET /api/v1/tax-claims/admin/all
 * @desc    獲取所有退稅申請
 * @access  Private (ADMIN only)
 */
router.get(
  '/admin/all',
  authorize(UserRole.ADMIN),
  asyncHandler(taxClaimController.getAllTaxClaims)
);

/**
 * @route   GET /api/v1/tax-claims/admin/stats
 * @desc    獲取退稅統計資料
 * @access  Private (ADMIN only)
 */
router.get(
  '/admin/stats',
  authorize(UserRole.ADMIN),
  asyncHandler(taxClaimController.getTaxClaimStats)
);

/**
 * @route   PATCH /api/v1/tax-claims/admin/:id/review
 * @desc    審核退稅申請
 * @access  Private (ADMIN only)
 */
router.patch(
  '/admin/:id/review',
  authorize(UserRole.ADMIN),
  asyncHandler(taxClaimController.reviewTaxClaim)
);

/**
 * @route   POST /api/v1/tax-claims/admin/:id/disburse
 * @desc    手動發放 Token 和 NFT
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/disburse',
  authorize(UserRole.ADMIN),
  asyncHandler(taxClaimController.disburseTokens)
);

/**
 * @route   POST /api/v1/tax-claims/admin/:id/emergency-transfer
 * @desc    緊急轉移靈魂綁定 NFT（用於錢包遺失等特殊情況）
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/emergency-transfer',
  authorize(UserRole.ADMIN),
  asyncHandler(taxClaimController.emergencyTransferNFT)
);

// ===== 使用者路由 =====

/**
 * @route   GET /api/v1/tax-claims
 * @desc    獲取當前使用者的所有退稅申請
 * @access  Private (TOURIST)
 */
router.get('/', asyncHandler(taxClaimController.getMyTaxClaims));

/**
 * @route   GET /api/v1/tax-claims/:id
 * @desc    獲取單一退稅申請詳情
 * @access  Private (TOURIST)
 */
router.get('/:id', asyncHandler(taxClaimController.getTaxClaimById));

export default router;
