import { Router } from 'express';
import * as userController from '@/controllers/user.controller.js';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { UserRole } from '@/types/index.js';

const router = Router();

// 所有使用者路由都需要認證
router.use(authenticate);

/**
 * @route   GET /api/v1/users
 * @desc    獲取所有使用者列表 (管理員專用)
 * @access  Private (Admin)
 */
router.get(
  '/',
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getAllUsers)
);

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    更新使用者角色 (管理員專用)
 * @access  Private (Admin)
 */
router.patch(
  '/:id/role',
  authorize(UserRole.ADMIN),
  asyncHandler(userController.updateUserRole)
);

/**
 * @route   GET /api/v1/users/:id/balances
 * @desc    獲取用戶錢包餘額 (管理員專用)
 * @access  Private (Admin)
 */
router.get(
  '/:id/balances',
  authorize(UserRole.ADMIN),
  asyncHandler(userController.getUserBalances)
);

/**
 * @route   POST /api/v1/users/:id/mint-taxcoin
 * @desc    管理員為用戶鑄造 TaxCoin (管理員專用)
 * @access  Private (Admin)
 */
router.post(
  '/:id/mint-taxcoin',
  authorize(UserRole.ADMIN),
  asyncHandler(userController.adminMintTaxCoinToUser)
);

/**
 * @route   GET /api/v1/users/me
 * @desc    獲取當前使用者資料
 * @access  Private
 */
router.get('/me', asyncHandler(userController.getCurrentUser));

/**
 * @route   PATCH /api/v1/users/me
 * @desc    更新使用者資料
 * @access  Private
 */
router.patch('/me', asyncHandler(userController.updateProfile));

/**
 * @route   GET /api/v1/users/me/stats
 * @desc    獲取使用者統計資料
 * @access  Private
 */
router.get('/me/stats', asyncHandler(userController.getUserStats));

/**
 * @route   GET /api/v1/users/me/notifications
 * @desc    獲取使用者通知列表
 * @access  Private
 */
router.get('/me/notifications', asyncHandler(userController.getNotifications));

/**
 * @route   PATCH /api/v1/users/me/notifications/:id/read
 * @desc    標記通知為已讀
 * @access  Private
 */
router.patch(
  '/me/notifications/:id/read',
  asyncHandler(userController.markNotificationAsRead)
);

export default router;
