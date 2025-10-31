import { Router } from 'express';
import * as rwaPoolController from '@/controllers/rwaPool.controller.js';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { UserRole } from '@/types/index.js';

const router = Router();

// 所有路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/rwa-pools
 * @desc    獲取所有投資池列表
 * @access  Private
 */
router.get('/', asyncHandler(rwaPoolController.getAllPools));

/**
 * @route   GET /api/v1/rwa-pools/my-investments
 * @desc    獲取我的投資列表
 * @access  Private (INVESTOR)
 */
router.get(
  '/my-investments',
  authorize(UserRole.INVESTOR),
  asyncHandler(rwaPoolController.getMyInvestments)
);

/**
 * @route   GET /api/v1/rwa-pools/:id
 * @desc    獲取單一投資池詳情
 * @access  Private
 */
router.get('/:id', asyncHandler(rwaPoolController.getPoolById));

/**
 * @route   POST /api/v1/rwa-pools/:id/invest
 * @desc    投資到池中
 * @access  Private (INVESTOR only)
 */
router.post(
  '/:id/invest',
  authorize(UserRole.INVESTOR),
  asyncHandler(rwaPoolController.investToPool)
);

/**
 * @route   POST /api/v1/rwa-pools/:id/build-claim-transaction
 * @desc    構建領取收益交易
 * @access  Private (INVESTOR only)
 */
router.post(
  '/:id/build-claim-transaction',
  authorize(UserRole.INVESTOR),
  asyncHandler(rwaPoolController.buildClaimTransaction)
);

/**
 * @route   POST /api/v1/rwa-pools/:id/confirm-claim
 * @desc    確認領取收益完成
 * @access  Private (INVESTOR only)
 */
router.post(
  '/:id/confirm-claim',
  authorize(UserRole.INVESTOR),
  asyncHandler(rwaPoolController.confirmClaimYield)
);

// ===== 管理員路由 =====

/**
 * @route   POST /api/v1/admin/rwa-pools
 * @desc    創建 RWA 投資池
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/create',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.createPool)
);

/**
 * @route   GET /api/v1/admin/rwa-pools/stats
 * @desc    獲取投資池統計
 * @access  Private (ADMIN only)
 */
router.get(
  '/admin/stats',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.getPoolStats)
);

/**
 * @route   POST /api/v1/admin/rwa-pools/:id/check-status
 * @desc    手動觸發池狀態更新 (測試用)
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/check-status',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.checkPoolStatus)
);

/**
 * @route   POST /api/v1/admin/rwa-pools/:id/settle
 * @desc    結算投資池
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/settle',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.settlePool)
);

/**
 * @route   POST /api/v1/admin/rwa-pools/:id/update-maturity-date
 * @desc    🧪 修改投資池到期日（測試用）
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/update-maturity-date',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.updateMaturityDateForTesting)
);

/**
 * @route   POST /api/v1/admin/rwa-pools/:id/deposit-yield
 * @desc    Admin 注入收益到投資池
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/deposit-yield',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.depositYield)
);

/**
 * @route   POST /api/v1/admin/rwa-pools/:id/update-status-to-matured
 * @desc    🧪 更新池狀態到 MATURED（測試用）
 * @access  Private (ADMIN only)
 */
router.post(
  '/admin/:id/update-status-to-matured',
  authorize(UserRole.ADMIN),
  asyncHandler(rwaPoolController.updateStatusToMaturedForTesting)
);

export default router;
