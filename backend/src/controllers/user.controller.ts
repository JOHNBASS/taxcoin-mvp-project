import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.js';
import { AuthRequest, ApiResponse } from '@/types/index.js';
import { NotFoundError, ValidationError } from '@/utils/errors.js';
import { logger } from '@/utils/logger.js';
import { suiService } from '@/services/sui.service.js';

// ===== 請求驗證 Schema =====

const updateProfileSchema = z.object({
  email: z.string().email('Email 格式錯誤').optional(),
  phoneNumber: z.string().optional(),
});

// ===== 控制器函數 =====

/**
 * 獲取當前使用者資料
 * GET /api/v1/users/me
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

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

  const response: ApiResponse = {
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

/**
 * 更新使用者資料
 * PATCH /api/v1/users/me
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 驗證請求
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { email, phoneNumber } = parseResult.data;

  // 檢查 email 是否已被其他使用者使用
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

  // 更新使用者資料
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      phoneNumber,
    },
  });

  logger.info('使用者資料更新成功', { userId });

  const response: ApiResponse = {
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

/**
 * 獲取使用者統計資料
 * GET /api/v1/users/me/stats
 */
export const getUserStats = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 根據角色返回不同的統計資料
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('使用者不存在');
  }

  let stats = {};

  if (user.role === 'TOURIST') {
    // 旅客統計: 退稅申請數量和金額
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
  } else if (user.role === 'INVESTOR') {
    // 投資者統計: 投資金額和收益
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

  const response: ApiResponse = {
    success: true,
    data: {
      role: user.role,
      stats,
    },
  };

  return res.json(response);
};

/**
 * 獲取使用者通知
 * GET /api/v1/users/me/notifications
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 解析查詢參數
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
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

  const response: ApiResponse = {
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

/**
 * 標記通知為已讀
 * PATCH /api/v1/users/me/notifications/:id/read
 */
export const markNotificationAsRead = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user!.userId;
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

  const response: ApiResponse = {
    success: true,
    data: {
      message: '通知已標記為已讀',
    },
  };

  return res.json(response);
};

// ===== 管理員專用控制器 =====

/**
 * 獲取所有使用者列表 (管理員專用)
 * GET /api/v1/users
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  // 解析查詢參數
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;

  // 構建查詢條件
  const where: any = {};

  if (role) {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { walletAddress: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { did: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        did: true,
        role: true,
        kycStatus: true,
        walletAddress: true,
        email: true,
        phoneNumber: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  logger.info('管理員獲取使用者列表', {
    adminId: req.user!.userId,
    total,
    page,
    limit
  });

  const response: ApiResponse = {
    success: true,
    data: {
      users,
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

const updateUserRoleSchema = z.object({
  role: z.enum(['TOURIST', 'INVESTOR', 'MERCHANT', 'ADMIN'], {
    errorMap: () => ({ message: '角色必須是 TOURIST、INVESTOR、MERCHANT 或 ADMIN' }),
  }),
});

/**
 * 更新使用者角色 (管理員專用)
 * PATCH /api/v1/users/:id/role
 */
export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;
  const adminUserId = req.user!.userId;

  // 驗證請求
  const parseResult = updateUserRoleSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { role } = parseResult.data;

  // 檢查目標使用者是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new NotFoundError('使用者不存在');
  }

  // 防止管理員修改自己的角色
  if (targetUserId === adminUserId) {
    throw new ValidationError('不能修改自己的角色');
  }

  // 更新使用者角色
  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
    select: {
      id: true,
      did: true,
      role: true,
      walletAddress: true,
      email: true,
      updatedAt: true,
    },
  });

  logger.info('管理員更新使用者角色', {
    adminId: adminUserId,
    targetUserId,
    oldRole: targetUser.role,
    newRole: role,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      message: '使用者角色更新成功',
      user: updatedUser,
    },
  };

  return res.json(response);
};

/**
 * 獲取用戶錢包餘額 (管理員專用)
 * GET /api/v1/users/:id/balances
 */
export const getUserBalances = async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.id;

  // 檢查目標使用者是否存在
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      walletAddress: true,
    },
  });

  if (!user) {
    throw new NotFoundError('使用者不存在');
  }

  if (!user.walletAddress) {
    throw new ValidationError('該使用者尚未設置錢包地址');
  }

  try {
    // 並行查詢 SUI 和 TAXCOIN 餘額
    const [suiBalance, taxcoinBalance] = await Promise.all([
      suiService.getSuiBalance(user.walletAddress),
      suiService.getTaxCoinBalance(user.walletAddress),
    ]);

    logger.info('管理員查詢使用者餘額', {
      adminId: req.user!.userId,
      targetUserId,
      walletAddress: user.walletAddress,
      suiBalance,
      taxcoinBalance,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        walletAddress: user.walletAddress,
        suiBalance,
        taxcoinBalance,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('查詢使用者餘額失敗', { error, targetUserId });
    throw error;
  }
};

const adminMintTaxCoinSchema = z.object({
  amount: z.number().positive('金額必須大於 0'),
  reason: z.string().optional(),
});

/**
 * 管理員為用戶鑄造 TaxCoin (管理員專用)
 * POST /api/v1/users/:id/mint-taxcoin
 */
export const adminMintTaxCoinToUser = async (
  req: AuthRequest,
  res: Response
) => {
  const targetUserId = req.params.id;
  const adminUserId = req.user!.userId;

  // 驗證請求
  const parseResult = adminMintTaxCoinSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { amount, reason } = parseResult.data;

  // 檢查目標使用者是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      walletAddress: true,
      did: true,
    },
  });

  if (!targetUser) {
    throw new NotFoundError('使用者不存在');
  }

  if (!targetUser.walletAddress) {
    throw new ValidationError('該使用者尚未設置錢包地址');
  }

  try {
    // 調用區塊鏈服務鑄造 TaxCoin
    const txHash = await suiService.adminMintTaxCoin({
      recipientAddress: targetUser.walletAddress,
      amount,
    });

    logger.info('管理員為使用者鑄造 TaxCoin 成功', {
      adminId: adminUserId,
      targetUserId,
      targetWallet: targetUser.walletAddress,
      amount,
      reason: reason || '未提供',
      txHash,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        message: '鑄造 TaxCoin 成功',
        txHash,
        amount,
        recipientAddress: targetUser.walletAddress,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('管理員鑄造 TaxCoin 失敗', {
      error,
      adminId: adminUserId,
      targetUserId,
      amount,
    });
    throw error;
  }
};
