import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadFields } from '../middlewares/upload.middleware.js';
import { submitKyc, getMyKyc, getAllKyc, getKycById, reviewKyc, getKycStats, } from '../controllers/kyc.controller.js';
const router = Router();
router.post('/submit', authenticate, uploadFields([
    { name: 'passport', maxCount: 1 },
    { name: 'face', maxCount: 1 },
]), submitKyc);
router.get('/me', authenticate, getMyKyc);
router.get('/admin/all', authenticate, authorize('ADMIN'), getAllKyc);
router.get('/admin/:id', authenticate, authorize('ADMIN'), getKycById);
router.patch('/admin/:id/review', authenticate, authorize('ADMIN'), reviewKyc);
router.get('/admin/stats', authenticate, authorize('ADMIN'), getKycStats);
export default router;
//# sourceMappingURL=kyc.routes.js.map