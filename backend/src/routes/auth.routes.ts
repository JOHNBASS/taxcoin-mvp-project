import { Router } from 'express';
import * as authController from '@/controllers/auth.controller.js';
import { asyncHandler } from '@/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/nonce
 * @desc    獲取登入 nonce 和訊息
 * @access  Public
 */
router.post('/nonce', asyncHandler(authController.getNonce));

/**
 * @route   POST /api/v1/auth/wallet-login
 * @desc    錢包簽名登入
 * @access  Public
 */
router.post('/wallet-login', asyncHandler(authController.walletLogin));

/**
 * @route   POST /api/v1/auth/register
 * @desc    使用者註冊
 * @access  Public
 */
router.post('/register', asyncHandler(authController.register));

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    刷新 JWT Token
 * @access  Public
 */
router.post('/refresh', asyncHandler(authController.refreshToken));

export default router;
