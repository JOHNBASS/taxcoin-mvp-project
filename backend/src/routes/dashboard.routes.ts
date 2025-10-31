/**
 * 管理員儀表板路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import {
  getSystemOverview,
  getUserGrowthTrend,
  getPoolPerformance,
  getYieldDistributionHistory,
  manualYieldDistribution,
  manualInvestmentSettlement,
  getSchedulerStatusInfo,
  getActivityLogs,
} from '@/controllers/dashboard.controller.js';

const router = Router();

// 所有儀表板端點都需要管理員權限
router.use(authenticate, authorize('ADMIN'));

/**
 * GET /admin/dashboard/overview
 * 獲取系統總覽統計
 */
router.get('/overview', getSystemOverview);

/**
 * GET /admin/dashboard/user-growth
 * 獲取使用者成長趨勢
 */
router.get('/user-growth', getUserGrowthTrend);

/**
 * GET /admin/dashboard/pool-performance
 * 獲取投資池表現排行
 */
router.get('/pool-performance', getPoolPerformance);

/**
 * GET /admin/dashboard/yield-history
 * 獲取收益分配歷史
 */
router.get('/yield-history', getYieldDistributionHistory);

/**
 * POST /admin/dashboard/trigger-yield-distribution
 * 手動觸發收益分配
 */
router.post('/trigger-yield-distribution', manualYieldDistribution);

/**
 * POST /admin/dashboard/trigger-settlement
 * 手動觸發投資結算
 */
router.post('/trigger-settlement', manualInvestmentSettlement);

/**
 * GET /admin/dashboard/scheduler-status
 * 獲取定時任務狀態
 */
router.get('/scheduler-status', getSchedulerStatusInfo);

/**
 * GET /admin/dashboard/activity-logs
 * 獲取系統活動日誌
 */
router.get('/activity-logs', getActivityLogs);

export default router;
