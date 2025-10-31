import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
const updateProfileSchema = z.object({
    email: z.string().email('Email 格式錯誤').optional(),
    phoneNumber: z.string().optional(),
});
export const getCurrentUser = async (req, res) => {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            kycRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });
    if (!user) {
        throw new NotFoundError('使用者不存在');
    }
    const response = {
        success: true,
        data: {
            id: user.id,
            did: user.did,
            role: user.role,
            kycStatus: user.kycStatus,
            walletAddress: user.walletAddress,
            email: user.email,
            phoneNumber: user.phoneNumber,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            latestKycRecord: user.kycRecords[0] ?? null,
        },
    };
    return res.json(response);
};
export const updateProfile = async (req, res) => {
    const userId = req.user.userId;
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { email, phoneNumber } = parseResult.data;
    if (email) {
        const existingUser = await prisma.user.findFirst({
            where: {
                email,
                NOT: { id: userId },
            },
        });
        if (existingUser) {
            throw new ValidationError('此 Email 已被使用');
        }
    }
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            email,
            phoneNumber,
        },
    });
    logger.info('使用者資料更新成功', { userId });
    const response = {
        success: true,
        data: {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            updatedAt: user.updatedAt,
        },
    };
    return res.json(response);
};
export const getUserStats = async (req, res) => {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new NotFoundError('使用者不存在');
    }
    let stats = {};
    if (user.role === 'TOURIST') {
        const [totalClaims, approvedClaims, totalTaxAmount] = await Promise.all([
            prisma.taxClaim.count({ where: { userId } }),
            prisma.taxClaim.count({
                where: { userId, status: 'APPROVED' },
            }),
            prisma.taxClaim.aggregate({
                where: { userId, status: 'DISBURSED' },
                _sum: { taxCoinAmount: true },
            }),
        ]);
        stats = {
            totalClaims,
            approvedClaims,
            pendingClaims: totalClaims - approvedClaims,
            totalTaxCoins: totalTaxAmount._sum.taxCoinAmount || 0,
        };
    }
    else if (user.role === 'INVESTOR') {
        const [totalInvestments, totalInvested, totalYield] = await Promise.all([
            prisma.investment.count({ where: { userId } }),
            prisma.investment.aggregate({
                where: { userId },
                _sum: { investmentAmount: true },
            }),
            prisma.investment.aggregate({
                where: { userId },
                _sum: { yieldAmount: true },
            }),
        ]);
        stats = {
            totalInvestments,
            totalInvested: totalInvested._sum.investmentAmount || 0,
            totalYield: totalYield._sum.yieldAmount || 0,
        };
    }
    const response = {
        success: true,
        data: {
            role: user.role,
            stats,
        },
    };
    return res.json(response);
};
export const getNotifications = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.notification.count({ where: { userId } }),
    ]);
    const response = {
        success: true,
        data: {
            notifications,
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
export const markNotificationAsRead = async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    const notification = await prisma.notification.findFirst({
        where: {
            id: notificationId,
            userId,
        },
    });
    if (!notification) {
        throw new NotFoundError('通知不存在');
    }
    await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
    });
    const response = {
        success: true,
        data: {
            message: '通知已標記為已讀',
        },
    };
    return res.json(response);
};
//# sourceMappingURL=user.controller.js.map