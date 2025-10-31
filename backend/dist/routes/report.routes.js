import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { getPoolReport, getTaxClaimReport, getUserReport, getYieldDistributionReport, getFinancialReport, } from '../controllers/report.controller.js';
const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.get('/pool', getPoolReport);
router.get('/tax-claims', getTaxClaimReport);
router.get('/users', getUserReport);
router.get('/yield-distribution', getYieldDistributionReport);
router.get('/financial', getFinancialReport);
export default router;
//# sourceMappingURL=report.routes.js.map