import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { triggerYieldDistribution, triggerInvestmentSettlement, } from '../services/scheduler.service.js';
import { getSchedulerStatus } from '../services/scheduler.service.js';
export const getSystemOverview = asyncHandler(async (_req, res) => {
    const [totalUsers, touristCount, investorCount, adminCount] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'TOURIST' } }),
        prisma.user.count({ where: { role: 'INVESTOR' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);
    const [verifiedKyc, pendingKyc, rejectedKyc] = await Promise.all([
        prisma.user.count({ where: { kycStatus: 'VERIFIED' } }),
        prisma.user.count({ where: { kycStatus: 'PENDING' } }),
        prisma.user.count({ where: { kycStatus: 'REJECTED' } }),
    ]);
    const [totalTaxClaims, pendingClaims, approvedClaims, rejectedClaims, taxClaimStats,] = await Promise.all([
        prisma.taxClaim.count(),
        prisma.taxClaim.count({ where: { status: 'PENDING' } }),
        prisma.taxClaim.count({ where: { status: 'APPROVED' } }),
        prisma.taxClaim.count({ where: { status: 'REJECTED' } }),
        prisma.taxClaim.aggregate({
            _sum: { taxAmount: true, taxCoinAmount: true },
        }),
    ]);
    const [totalPools, activePools, totalInvestments, investmentStats] = await Promise.all([
        prisma.rwaPool.count(),
        prisma.rwaPool.count({ where: { status: 'RECRUITING' } }),
        prisma.investment.count(),
        prisma.investment.aggregate({
            _sum: { investmentAmount: true, yieldAmount: true },
        }),
    ]);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await prisma.user.count({
        where: {
            createdAt: {
                gte: sevenDaysAgo,
            },
        },
    });
    const recentTaxClaims = await prisma.taxClaim.count({
        where: {
            createdAt: {
                gte: sevenDaysAgo,
            },
        },
    });
    return res.json({
        success: true,
        data: {
            users: {
                total: totalUsers,
                tourist: touristCount,
                investor: investorCount,
                admin: adminCount,
                recentNew: recentUsers,
            },
            kyc: {
                verified: verifiedKyc,
                pending: pendingKyc,
                rejected: rejectedKyc,
                verificationRate: totalUsers > 0 ? ((verifiedKyc / totalUsers) * 100).toFixed(1) : 0,
            },
            taxClaims: {
                total: totalTaxClaims,
                pending: pendingClaims,
                approved: approvedClaims,
                rejected: rejectedClaims,
                totalTaxAmount: taxClaimStats._sum.taxAmount || 0,
                totalTaxCoinAmount: taxClaimStats._sum.taxCoinAmount || 0,
                approvalRate: totalTaxClaims > 0 ? ((approvedClaims / totalTaxClaims) * 100).toFixed(1) : 0,
                recentNew: recentTaxClaims,
            },
            rwaInvestments: {
                totalPools,
                activePools,
                totalInvestments,
                totalInvested: investmentStats._sum.investmentAmount || 0,
                totalYieldDistributed: investmentStats._sum.yieldAmount || 0,
            },
        },
    });
});
export const getUserGrowthTrend = asyncHandler(async (_req, res) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const users = await prisma.user.findMany({
        where: {
            createdAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            createdAt: true,
            role: true,
        },
    });
    const dailyStats = {};
    users.forEach((user) => {
        const dateKey = user.createdAt.toISOString().split('T')[0];
        if (!dateKey)
            return;
        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = {
                date: dateKey,
                tourist: 0,
                investor: 0,
                total: 0,
            };
        }
        if (user.role === 'TOURIST') {
            dailyStats[dateKey].tourist++;
        }
        else if (user.role === 'INVESTOR') {
            dailyStats[dateKey].investor++;
        }
        dailyStats[dateKey].total++;
    });
    const trend = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
    return res.json({
        success: true,
        data: {
            period: '30 days',
            trend,
        },
    });
});
export const getPoolPerformance = asyncHandler(async (_req, res) => {
    const pools = await prisma.rwaPool.findMany({
        select: {
            id: true,
            name: true,
            targetAmount: true,
            currentAmount: true,
            yieldRate: true,
            status: true,
            _count: {
                select: { investments: true },
            },
        },
        orderBy: {
            currentAmount: 'desc',
        },
        take: 10,
    });
    const poolsWithStats = pools.map((pool) => ({
        id: pool.id,
        name: pool.name,
        targetAmount: Number(pool.targetAmount),
        currentAmount: Number(pool.currentAmount),
        fillRate: ((Number(pool.currentAmount) / Number(pool.targetAmount)) * 100).toFixed(1),
        yieldRate: Number(pool.yieldRate),
        status: pool.status,
        investorCount: pool._count.investments,
    }));
    return res.json({
        success: true,
        data: {
            topPools: poolsWithStats,
        },
    });
});
export const getYieldDistributionHistory = asyncHandler(async (_req, res) => {
    const history = await prisma.auditLog.findMany({
        where: {
            action: 'YIELD_DISTRIBUTION',
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 20,
    });
    return res.json({
        success: true,
        data: {
            history,
        },
    });
});
export const manualYieldDistribution = asyncHandler(async (_req, res) => {
    const result = await triggerYieldDistribution();
    return res.json({
        success: true,
        message: '收益分配已成功執行',
        data: result,
    });
});
export const manualInvestmentSettlement = asyncHandler(async (_req, res) => {
    const result = await triggerInvestmentSettlement();
    return res.json({
        success: true,
        message: '投資結算已成功執行',
        data: result,
    });
});
export const getSchedulerStatusInfo = asyncHandler(async (_req, res) => {
    const status = getSchedulerStatus();
    return res.json({
        success: true,
        data: status,
    });
});
export const getActivityLogs = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        }),
        prisma.auditLog.count(),
    ]);
    return res.json({
        success: true,
        data: {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
});
//# sourceMappingURL=dashboard.controller.js.map