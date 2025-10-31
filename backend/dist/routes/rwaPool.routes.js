import { Router } from 'express';
import * as rwaPoolController from '../controllers/rwaPool.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserRole } from '../types/index.js';
const router = Router();
router.use(authenticate);
router.get('/', asyncHandler(rwaPoolController.getAllPools));
router.get('/my-investments', authorize(UserRole.INVESTOR), asyncHandler(rwaPoolController.getMyInvestments));
router.get('/:id', asyncHandler(rwaPoolController.getPoolById));
router.post('/:id/invest', authorize(UserRole.INVESTOR), asyncHandler(rwaPoolController.investToPool));
router.post('/admin/create', authorize(UserRole.ADMIN), asyncHandler(rwaPoolController.createPool));
router.get('/admin/stats', authorize(UserRole.ADMIN), asyncHandler(rwaPoolController.getPoolStats));
export default router;
//# sourceMappingURL=rwaPool.routes.js.map