import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
export const generatePoolReport = async (poolId, startDate, endDate) => {
    logger.info('生成投資池報表', { poolId, startDate, endDate });
    const whereClause = {};
    if (poolId) {
        whereClause.id = poolId;
    }
    const pools = await prisma.rwaPool.findMany({
        where: whereClause,
        include: {
            items: true,
            investments: {
                where: {
                    ...(startDate && endDate
                        ? {
                            investedAt: {
                                gte: startDate,
                                lte: endDate,
                            },
                        }
                        : {}),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            },
        },
    });
    const report = pools.map((pool) => {
        const totalInvested = pool.investments.reduce((sum, inv) => sum + Number(inv.investmentAmount), 0);
        const totalYield = pool.investments.reduce((sum, inv) => sum + (inv.yieldAmount ? Number(inv.yieldAmount) : 0), 0);
        const activeInvestments = pool.investments.filter((inv) => inv.status === 'ACTIVE').length;
        const settledInvestments = pool.investments.filter((inv) => inv.status === 'REDEEMED').length;
        return {
            pool: {
                id: pool.id,
                name: pool.name,
                description: pool.description,
                targetAmount: Number(pool.targetAmount),
                currentAmount: Number(pool.currentAmount),
                fillRate: ((Number(pool.currentAmount) / Number(pool.targetAmount)) * 100).toFixed(2),
                yieldRate: Number(pool.yieldRate),
                status: pool.status,
                maturityDate: pool.maturityDate,
                riskLevel: pool.riskLevel,
                createdAt: pool.createdAt,
            },
            assets: pool.items.map((item) => ({
                taxClaimId: item.taxClaimId,
                addedAt: item.addedAt,
            })),
            investments: {
                total: pool.investments.length,
                active: activeInvestments,
                settled: settledInvestments,
                totalInvested,
                totalYield,
                averageInvestment: pool.investments.length > 0 ? totalInvested / pool.investments.length : 0,
            },
            investors: pool.investments.map((inv) => ({
                userId: inv.user.id,
                email: inv.user.email,
                role: inv.user.role,
                investmentAmount: Number(inv.investmentAmount),
                tokenAmount: Number(inv.tokenAmount),
                yieldAmount: inv.yieldAmount ? Number(inv.yieldAmount) : null,
                yieldRate: inv.yieldRate ? Number(inv.yieldRate) : null,
                status: inv.status,
                investedAt: inv.investedAt,
                redeemedAt: inv.redeemedAt,
            })),
        };
    });
    return {
        reportType: 'POOL_REPORT',
        generatedAt: new Date(),
        period: {
            startDate,
            endDate,
        },
        summary: {
            totalPools: pools.length,
            totalTargetAmount: pools.reduce((sum, p) => sum + Number(p.targetAmount), 0),
            totalCurrentAmount: pools.reduce((sum, p) => sum + Number(p.currentAmount), 0),
            totalInvestments: pools.reduce((sum, p) => sum + p.investments.length, 0),
        },
        data: report,
    };
};
export const generateTaxClaimReport = async (startDate, endDate, status) => {
    logger.info('生成退稅報表', { startDate, endDate, status });
    const whereClause = {
        createdAt: {
            gte: startDate,
            lte: endDate,
        },
    };
    if (status) {
        whereClause.status = status;
    }
    const taxClaims = await prisma.taxClaim.findMany({
        where: whereClause,
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    kycStatus: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    const summary = {
        total: taxClaims.length,
        pending: taxClaims.filter((tc) => tc.status === 'PENDING').length,
        approved: taxClaims.filter((tc) => tc.status === 'APPROVED').length,
        rejected: taxClaims.filter((tc) => tc.status === 'REJECTED').length,
        totalOriginalAmount: taxClaims.reduce((sum, tc) => sum + Number(tc.originalAmount), 0),
        totalTaxAmount: taxClaims.reduce((sum, tc) => sum + Number(tc.taxAmount), 0),
        totalTaxCoinAmount: taxClaims.reduce((sum, tc) => sum + Number(tc.taxCoinAmount), 0),
        approvalRate: taxClaims.length > 0
            ? ((taxClaims.filter((tc) => tc.status === 'APPROVED').length / taxClaims.length) * 100).toFixed(2)
            : 0,
    };
    const data = taxClaims.map((claim) => ({
        id: claim.id,
        user: {
            id: claim.user.id,
            email: claim.user.email,
            role: claim.user.role,
            kycStatus: claim.user.kycStatus,
        },
        merchantName: claim.merchantName,
        purchaseDate: claim.purchaseDate,
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        taxCoinAmount: claim.taxCoinAmount,
        status: claim.status,
        receiptImageUrl: claim.receiptImageUrl,
        ocrData: claim.ocrData,
        reviewedAt: claim.reviewedAt,
        rejectedReason: claim.rejectedReason,
        createdAt: claim.createdAt,
    }));
    return {
        reportType: 'TAX_CLAIM_REPORT',
        generatedAt: new Date(),
        period: {
            startDate,
            endDate,
        },
        summary,
        data,
    };
};
export const generateUserReport = async (role, kycStatus) => {
    logger.info('生成使用者報表', { role, kycStatus });
    const whereClause = {};
    if (role) {
        whereClause.role = role;
    }
    if (kycStatus) {
        whereClause.kycStatus = kycStatus;
    }
    const users = await prisma.user.findMany({
        where: whereClause,
        include: {
            taxClaims: true,
            investments: true,
            kycRecords: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    const summary = {
        total: users.length,
        byRole: {
            tourist: users.filter((u) => u.role === 'TOURIST').length,
            investor: users.filter((u) => u.role === 'INVESTOR').length,
            admin: users.filter((u) => u.role === 'ADMIN').length,
        },
        byKycStatus: {
            verified: users.filter((u) => u.kycStatus === 'VERIFIED').length,
            pending: users.filter((u) => u.kycStatus === 'PENDING').length,
            rejected: users.filter((u) => u.kycStatus === 'REJECTED').length,
        },
        totalTaxClaims: users.reduce((sum, u) => sum + u.taxClaims.length, 0),
        totalInvestments: users.reduce((sum, u) => sum + u.investments.length, 0),
    };
    const data = users.map((user) => ({
        id: user.id,
        did: user.did,
        walletAddress: user.walletAddress,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        kycStatus: user.kycStatus,
        taxClaims: {
            total: user.taxClaims.length,
            approved: user.taxClaims.filter((tc) => tc.status === 'APPROVED').length,
            totalTaxAmount: user.taxClaims.reduce((sum, tc) => sum + Number(tc.taxAmount), 0),
        },
        investments: {
            total: user.investments.length,
            active: user.investments.filter((inv) => inv.status === 'ACTIVE').length,
            totalInvested: user.investments.reduce((sum, inv) => sum + Number(inv.investmentAmount), 0),
            totalYield: user.investments.reduce((sum, inv) => sum + (inv.yieldAmount ? Number(inv.yieldAmount) : 0), 0),
        },
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
    }));
    return {
        reportType: 'USER_REPORT',
        generatedAt: new Date(),
        summary,
        data,
    };
};
export const generateYieldDistributionReport = async (startDate, endDate) => {
    logger.info('生成收益分配報表', { startDate, endDate });
    const distributionLogs = await prisma.auditLog.findMany({
        where: {
            action: 'YIELD_DISTRIBUTION',
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    const totalDistributed = distributionLogs.reduce((sum, log) => {
        const details = log.details;
        return sum + (details?.totalDistributed || 0);
    }, 0);
    const totalInvestors = distributionLogs.reduce((sum, log) => {
        const details = log.details;
        return sum + (details?.investorCount || 0);
    }, 0);
    return {
        reportType: 'YIELD_DISTRIBUTION_REPORT',
        generatedAt: new Date(),
        period: {
            startDate,
            endDate,
        },
        summary: {
            totalDistributions: distributionLogs.length,
            totalDistributed,
            totalInvestors,
            averagePerDistribution: distributionLogs.length > 0 ? totalDistributed / distributionLogs.length : 0,
        },
        data: distributionLogs.map((log) => {
            const details = log.details;
            return {
                id: log.id,
                poolId: log.entityId,
                totalDistributed: details?.totalDistributed || 0,
                investorCount: details?.investorCount || 0,
                distributedAt: log.createdAt,
            };
        }),
    };
};
export const generateFinancialReport = async (startDate, endDate) => {
    logger.info('生成財務報表', { startDate, endDate });
    const taxClaims = await prisma.taxClaim.findMany({
        where: {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            status: 'APPROVED',
        },
    });
    const investments = await prisma.investment.findMany({
        where: {
            investedAt: {
                gte: startDate,
                lte: endDate,
            },
        },
    });
    const totalTaxRefund = taxClaims.reduce((sum, tc) => sum + Number(tc.taxAmount), 0);
    const totalTaxCoinIssued = taxClaims.reduce((sum, tc) => sum + Number(tc.taxCoinAmount), 0);
    const totalInvestmentAmount = investments.reduce((sum, inv) => sum + Number(inv.investmentAmount), 0);
    const totalYieldDistributed = investments.reduce((sum, inv) => sum + (inv.yieldAmount ? Number(inv.yieldAmount) : 0), 0);
    return {
        reportType: 'FINANCIAL_REPORT',
        generatedAt: new Date(),
        period: {
            startDate,
            endDate,
        },
        summary: {
            taxRefund: {
                totalClaims: taxClaims.length,
                totalAmount: totalTaxRefund,
                totalTaxCoinIssued,
            },
            investment: {
                totalInvestments: investments.length,
                totalInvested: totalInvestmentAmount,
                totalYieldDistributed,
                netFlow: totalInvestmentAmount - totalYieldDistributed,
            },
            overall: {
                totalRevenue: totalInvestmentAmount,
                totalExpense: totalTaxRefund + totalYieldDistributed,
                netProfit: totalInvestmentAmount - (totalTaxRefund + totalYieldDistributed),
            },
        },
    };
};
//# sourceMappingURL=report.service.js.map