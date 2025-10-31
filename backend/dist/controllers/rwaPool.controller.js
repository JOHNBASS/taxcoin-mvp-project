import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { UserRole } from '../types/index.js';
import { ValidationError, NotFoundError, BusinessError, } from '../utils/errors.js';
import { ErrorCode } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { calculateFillRate, calculateTokenAmount, calculateExpectedYield, calculateDaysToMaturity, checkPoolAvailability, validateInvestmentAmount, updatePoolStatus, } from '../services/rwaPool.service.js';
const createPoolSchema = z.object({
    poolName: z.string().min(1, '池名稱不能為空'),
    targetAmount: z.number().min(10000, '目標金額至少 10,000 TWD'),
    yieldRate: z.number().min(0).max(30, '收益率必須在 0-30% 之間'),
    maturityDate: z.string().refine((date) => {
        const maturity = new Date(date);
        const now = new Date();
        return maturity > now;
    }, '到期日必須是未來日期'),
    totalTokenSupply: z.number().optional(),
});
const investSchema = z.object({
    amount: z.number().min(1000, '最低投資金額為 1,000 TWD'),
});
export const createPool = async (req, res) => {
    const parseResult = createPoolSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { poolName, targetAmount, yieldRate, maturityDate, totalTokenSupply } = parseResult.data;
    const pool = await prisma.rwaPool.create({
        data: {
            poolName,
            targetAmount,
            yieldRate,
            maturityDate: new Date(maturityDate),
            totalTokenSupply: totalTokenSupply || targetAmount * 100,
            status: 'RECRUITING',
        },
    });
    logger.info('RWA 投資池創建成功', {
        poolId: pool.id,
        poolName,
        targetAmount,
    });
    const response = {
        success: true,
        data: {
            id: pool.id,
            poolName: pool.poolName,
            targetAmount: pool.targetAmount,
            currentAmount: pool.currentAmount,
            yieldRate: pool.yieldRate,
            maturityDate: pool.maturityDate,
            status: pool.status,
            fillRate: 0,
            createdAt: pool.createdAt,
        },
    };
    return res.status(201).json(response);
};
export const getAllPools = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) {
        where.status = status;
    }
    const [pools, total] = await Promise.all([
        prisma.rwaPool.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                _count: {
                    select: {
                        items: true,
                        investments: true,
                    },
                },
            },
        }),
        prisma.rwaPool.count({ where }),
    ]);
    const poolsWithStats = pools.map((pool) => ({
        id: pool.id,
        poolName: pool.poolName,
        targetAmount: pool.targetAmount,
        currentAmount: pool.currentAmount,
        yieldRate: pool.yieldRate,
        maturityDate: pool.maturityDate,
        status: pool.status,
        fillRate: calculateFillRate(Number(pool.currentAmount), Number(pool.targetAmount)),
        daysToMaturity: calculateDaysToMaturity(pool.maturityDate),
        itemCount: pool._count.items,
        investorCount: pool._count.investments,
        createdAt: pool.createdAt,
    }));
    const response = {
        success: true,
        data: {
            pools: poolsWithStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
    return res.json(response);
};
export const getPoolById = async (req, res) => {
    const poolId = req.params.id;
    if (!poolId) {
        throw new ValidationError('缺少 poolId 參數');
    }
    const pool = await prisma.rwaPool.findUnique({
        where: { id: poolId },
        include: {
            items: {
                include: {
                    taxClaim: {
                        select: {
                            id: true,
                            taxAmount: true,
                            createdAt: true,
                        },
                    },
                },
            },
            investments: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            walletAddress: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            },
        },
    });
    if (!pool) {
        throw new NotFoundError('投資池不存在');
    }
    await updatePoolStatus(poolId);
    const response = {
        success: true,
        data: {
            id: pool.id,
            poolName: pool.poolName,
            targetAmount: pool.targetAmount,
            currentAmount: pool.currentAmount,
            yieldRate: pool.yieldRate,
            maturityDate: pool.maturityDate,
            status: pool.status,
            totalTokenSupply: pool.totalTokenSupply,
            fillRate: calculateFillRate(Number(pool.currentAmount), Number(pool.targetAmount)),
            daysToMaturity: calculateDaysToMaturity(pool.maturityDate),
            items: pool.items,
            recentInvestments: pool.investments,
            createdAt: pool.createdAt,
            updatedAt: pool.updatedAt,
        },
    };
    return res.json(response);
};
export const investToPool = async (req, res) => {
    const userId = req.user.userId;
    const poolId = req.params.id;
    if (!poolId) {
        throw new ValidationError('缺少 poolId 參數');
    }
    if (req.user.role !== UserRole.INVESTOR) {
        throw new ValidationError('僅投資者可以進行投資');
    }
    const parseResult = investSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { amount } = parseResult.data;
    const availability = await checkPoolAvailability(poolId);
    if (!availability.available) {
        throw new BusinessError(ErrorCode.POOL_FULL, availability.reason || '投資池不可用');
    }
    const validation = await validateInvestmentAmount(amount, poolId);
    if (!validation.valid) {
        throw new ValidationError(validation.reason || '投資金額無效');
    }
    const pool = await prisma.rwaPool.findUnique({
        where: { id: poolId },
    });
    if (!pool) {
        throw new NotFoundError('投資池不存在');
    }
    const tokenAmount = calculateTokenAmount(amount, Number(pool.totalTokenSupply || 0), Number(pool.targetAmount));
    const daysToMaturity = calculateDaysToMaturity(pool.maturityDate);
    const expectedYield = calculateExpectedYield(amount, Number(pool.yieldRate), daysToMaturity);
    const investment = await prisma.$transaction(async (tx) => {
        const inv = await tx.investment.create({
            data: {
                userId,
                poolId,
                investmentAmount: amount,
                tokenAmount,
                yieldAmount: expectedYield,
            },
        });
        await tx.rwaPool.update({
            where: { id: poolId },
            data: {
                currentAmount: {
                    increment: amount,
                },
            },
        });
        await tx.notification.create({
            data: {
                userId,
                title: '投資成功',
                message: `您已成功投資 ${amount} TWD 到 ${pool.poolName},預期收益 ${expectedYield} TWD`,
                type: 'INVESTMENT_SUCCESS',
            },
        });
        return inv;
    });
    await updatePoolStatus(poolId);
    logger.info('投資成功', {
        investmentId: investment.id,
        userId,
        poolId,
        amount,
        tokenAmount,
    });
    const response = {
        success: true,
        data: {
            id: investment.id,
            poolId: investment.poolId,
            investmentAmount: investment.investmentAmount,
            tokenAmount: investment.tokenAmount,
            expectedYield: investment.yieldAmount,
            createdAt: investment.createdAt,
        },
    };
    return res.status(201).json(response);
};
export const getMyInvestments = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [investments, total] = await Promise.all([
        prisma.investment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                pool: {
                    select: {
                        id: true,
                        poolName: true,
                        yieldRate: true,
                        maturityDate: true,
                        status: true,
                    },
                },
            },
        }),
        prisma.investment.count({ where: { userId } }),
    ]);
    const response = {
        success: true,
        data: {
            investments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
    return res.json(response);
};
export const getPoolStats = async (_req, res) => {
    const [totalPools, activePools, totalInvestment, totalInvestors, averageYield,] = await Promise.all([
        prisma.rwaPool.count(),
        prisma.rwaPool.count({ where: { status: 'RECRUITING' } }),
        prisma.investment.aggregate({
            _sum: { investmentAmount: true },
        }),
        prisma.investment.groupBy({
            by: ['userId'],
        }),
        prisma.rwaPool.aggregate({
            _avg: { yieldRate: true },
        }),
    ]);
    const response = {
        success: true,
        data: {
            totalPools,
            activePools,
            totalInvestment: totalInvestment._sum.investmentAmount || 0,
            totalInvestors: totalInvestors.length,
            averageYield: averageYield._avg.yieldRate || 0,
        },
    };
    return res.json(response);
};
//# sourceMappingURL=rwaPool.controller.js.map