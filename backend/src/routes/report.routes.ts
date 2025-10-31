/**
 * 報表路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import {
  getPoolReport,
  getTaxClaimReport,
  getUserReport,
  getYieldDistributionReport,
  getFinancialReport,
} from '@/controllers/report.controller.js';

const router = Router();

// 所有報表端點都需要管理員權限
router.use(authenticate, authorize('ADMIN'));

/**
 * GET /admin/reports/pool
 * 生成投資池報表
 * Query: poolId?, startDate?, endDate?
 */
router.get('/pool', getPoolReport);

/**
 * GET /admin/reports/tax-claims
 * 生成退稅報表
 * Query: startDate, endDate, status?
 */
router.get('/tax-claims', getTaxClaimReport);

/**
 * GET /admin/reports/users
 * 生成使用者報表
 * Query: role?, kycStatus?
 */
router.get('/users', getUserReport);

/**
 * GET /admin/reports/yield-distribution
 * 生成收益分配報表
 * Query: startDate, endDate
 */
router.get('/yield-distribution', getYieldDistributionReport);

/**
 * GET /admin/reports/financial
 * 生成財務報表
 * Query: startDate, endDate
 */
router.get('/financial', getFinancialReport);

export default router;
