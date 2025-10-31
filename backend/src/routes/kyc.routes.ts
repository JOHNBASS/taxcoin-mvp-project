/**
 * KYC 驗證路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { uploadFields } from '@/middlewares/upload.middleware.js';
import {
  submitKyc,
  getMyKyc,
  getAllKyc,
  getKycById,
  reviewKyc,
  getKycStats,
  verifyCredentialController,
  selfVerify,
} from '@/controllers/kyc.controller.js';

const router = Router();

/**
 * POST /kyc/submit
 * 提交 KYC 驗證申請
 * 需要上傳: passport (護照照片), face (自拍照)
 */
router.post(
  '/submit',
  authenticate,
  uploadFields([
    { name: 'passport', maxCount: 1 },
    { name: 'face', maxCount: 1 },
  ]),
  submitKyc
);

/**
 * GET /kyc/me
 * 獲取我的 KYC 記錄
 */
router.get('/me', authenticate, getMyKyc);

/**
 * POST /kyc/self-verify
 * Self Protocol 快速驗證端點（零知識證明）
 * 注意：此端點不需要 authenticate，因為 Self Protocol App 會直接調用
 * 用戶身份通過 Self Protocol 的零知識證明來驗證
 */
router.post('/self-verify', selfVerify);

/**
 * POST /kyc/verify-credential
 * 驗證可驗證憑證
 */
router.post('/verify-credential', authenticate, verifyCredentialController);

/**
 * GET /admin/kyc/stats
 * 獲取 KYC 統計資料 (管理員)
 * 注意: 必須放在 /admin/:id 之前，否則 "stats" 會被當作 ID 參數
 */
router.get('/admin/stats', authenticate, authorize('ADMIN'), getKycStats);

/**
 * GET /admin/kyc
 * 獲取所有 KYC 申請 (管理員)
 * Query: page?, limit?, status?
 */
router.get('/admin/all', authenticate, authorize('ADMIN'), getAllKyc);

/**
 * GET /admin/kyc/:id
 * 獲取單一 KYC 記錄詳情 (管理員)
 */
router.get('/admin/:id', authenticate, authorize('ADMIN'), getKycById);

/**
 * PATCH /admin/kyc/:id/review
 * 審核 KYC 申請 (管理員)
 */
router.patch('/admin/:id/review', authenticate, authorize('ADMIN'), reviewKyc);

export default router;
