import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = Router();
router.use(authenticate);
router.get('/me', asyncHandler(userController.getCurrentUser));
router.patch('/me', asyncHandler(userController.updateProfile));
router.get('/me/stats', asyncHandler(userController.getUserStats));
router.get('/me/notifications', asyncHandler(userController.getNotifications));
router.patch('/me/notifications/:id/read', asyncHandler(userController.markNotificationAsRead));
export default router;
//# sourceMappingURL=user.routes.js.map