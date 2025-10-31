import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { getSystemOverview, getUserGrowthTrend, getPoolPerformance, getYieldDistributionHistory, manualYieldDistribution, manualInvestmentSettlement, getSchedulerStatusInfo, getActivityLogs, } from '../controllers/dashboard.controller.js';
const router = Router();
router.use(authenticate, authorize('ADMIN'));
router.get('/overview', getSystemOverview);
router.get('/user-growth', getUserGrowthTrend);
router.get('/pool-performance', getPoolPerformance);
router.get('/yield-history', getYieldDistributionHistory);
router.post('/trigger-yield-distribution', manualYieldDistribution);
router.post('/trigger-settlement', manualInvestmentSettlement);
router.get('/scheduler-status', getSchedulerStatusInfo);
router.get('/activity-logs', getActivityLogs);
export default router;
//# sourceMappingURL=dashboard.routes.js.map