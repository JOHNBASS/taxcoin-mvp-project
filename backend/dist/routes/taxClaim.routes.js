import { Router } from 'express';
import * as taxClaimController from '../controllers/taxClaim.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { uploadMultiple, handleUploadError } from '../middlewares/upload.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UserRole } from '../types/index.js';
const router = Router();
router.use(authenticate);
router.post('/', uploadMultiple('receipts', 5), handleUploadError, asyncHandler(taxClaimController.createTaxClaim));
router.get('/', asyncHandler(taxClaimController.getMyTaxClaims));
router.get('/:id', asyncHandler(taxClaimController.getTaxClaimById));
router.get('/admin/all', authorize(UserRole.ADMIN), asyncHandler(taxClaimController.getAllTaxClaims));
router.patch('/admin/:id/review', authorize(UserRole.ADMIN), asyncHandler(taxClaimController.reviewTaxClaim));
router.get('/admin/stats', authorize(UserRole.ADMIN), asyncHandler(taxClaimController.getTaxClaimStats));
export default router;
//# sourceMappingURL=taxClaim.routes.js.map