import { asyncHandler } from '../utils/asyncHandler.js';
import { generatePoolReport, generateTaxClaimReport, generateUserReport, generateYieldDistributionReport, generateFinancialReport, } from '../services/report.service.js';
export const getPoolReport = asyncHandler(async (req, res) => {
    const { poolId, startDate, endDate } = req.query;
    const report = await generatePoolReport(poolId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
    return res.json({
        success: true,
        data: report,
    });
});
export const getTaxClaimReport = asyncHandler(async (req, res) => {
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
    const report = await generateTaxClaimReport(new Date(startDate), new Date(endDate), status);
    return res.json({
        success: true,
        data: report,
    });
});
export const getUserReport = asyncHandler(async (req, res) => {
    const { role, kycStatus } = req.query;
    const report = await generateUserReport(role, kycStatus);
    return res.json({
        success: true,
        data: report,
    });
});
export const getYieldDistributionReport = asyncHandler(async (req, res) => {
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
    const report = await generateYieldDistributionReport(new Date(startDate), new Date(endDate));
    return res.json({
        success: true,
        data: report,
    });
});
export const getFinancialReport = asyncHandler(async (req, res) => {
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
    const report = await generateFinancialReport(new Date(startDate), new Date(endDate));
    return res.json({
        success: true,
        data: report,
    });
});
//# sourceMappingURL=report.controller.js.map