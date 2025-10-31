/**
 * 報表控制器
 *
 * 處理報表生成請求
 */

import { Response } from 'express';
import { AuthRequest } from '@/types/index.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import {
  generatePoolReport,
  generateTaxClaimReport,
  generateUserReport,
  generateYieldDistributionReport,
  generateFinancialReport,
} from '@/services/report.service.js';

/**
 * 生成投資池報表
 *
 * GET /admin/reports/pool
 * Query: poolId?, startDate?, endDate?
 */
export const getPoolReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { poolId, startDate, endDate } = req.query;

  const report = await generatePoolReport(
    poolId as string | undefined,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  return res.json({
    success: true,
    data: report,
  });
});

/**
 * 生成退稅報表
 *
 * GET /admin/reports/tax-claims
 * Query: startDate, endDate, status?
 */
export const getTaxClaimReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, status } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '請提供 startDate 和 endDate',
      },
    });
  }

  const report = await generateTaxClaimReport(
    new Date(startDate as string),
    new Date(endDate as string),
    status as string | undefined
  );

  return res.json({
    success: true,
    data: report,
  });
});

/**
 * 生成使用者報表
 *
 * GET /admin/reports/users
 * Query: role?, kycStatus?
 */
export const getUserReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { role, kycStatus } = req.query;

  const report = await generateUserReport(
    role as string | undefined,
    kycStatus as string | undefined
  );

  return res.json({
    success: true,
    data: report,
  });
});

/**
 * 生成收益分配報表
 *
 * GET /admin/reports/yield-distribution
 * Query: startDate, endDate
 */
export const getYieldDistributionReport = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '請提供 startDate 和 endDate',
        },
      });
    }

    const report = await generateYieldDistributionReport(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    return res.json({
      success: true,
      data: report,
    });
  }
);

/**
 * 生成財務報表
 *
 * GET /admin/reports/financial
 * Query: startDate, endDate
 */
export const getFinancialReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '請提供 startDate 和 endDate',
      },
    });
  }

  const report = await generateFinancialReport(
    new Date(startDate as string),
    new Date(endDate as string)
  );

  return res.json({
    success: true,
    data: report,
  });
});
