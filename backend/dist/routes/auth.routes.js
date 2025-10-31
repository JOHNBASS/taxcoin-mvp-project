import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = Router();
router.post('/nonce', asyncHandler(authController.getNonce));
router.post('/wallet-login', asyncHandler(authController.walletLogin));
router.post('/register', asyncHandler(authController.register));
router.post('/refresh', asyncHandler(authController.refreshToken));
export default router;
//# sourceMappingURL=auth.routes.js.map