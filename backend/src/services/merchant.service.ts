/**
 * 店家服務
 * 處理店家註冊、管理、查詢等功能
 */

import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import type {
  Merchant,
  CreateMerchantDto,
  UpdateMerchantDto,
  MerchantStats,
} from '@/types/payment.types.js';
import { MerchantStatus } from '@prisma/client';

/**
 * 創建店家
 */
export const createMerchant = async (
  userId: string,
  data: CreateMerchantDto
): Promise<Merchant> => {
  logger.info('創建店家', { userId, merchantName: data.merchantName });

  // 驗證用戶是否存在且角色為 MERCHANT
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '用戶不存在');
  }

  if (user.role !== 'MERCHANT') {
    throw new BusinessError(ErrorCode.FORBIDDEN, '只有店家角色可以創建店家資料');
  }

  // 檢查用戶是否已有店家
  const existingMerchant = await prisma.merchant.findFirst({
    where: { userId },
  });

  if (existingMerchant) {
    throw new BusinessError(ErrorCode.ALREADY_EXISTS, '該用戶已有店家資料');
  }

  // 檢查統一編號是否已被使用
  const existingTaxId = await prisma.merchant.findUnique({
    where: { taxId: data.taxId },
  });

  if (existingTaxId) {
    throw new BusinessError(ErrorCode.ALREADY_EXISTS, '該統一編號已被使用');
  }

  // 創建店家
  const merchant = await prisma.merchant.create({
    data: {
      userId,
      ...data,
      status: MerchantStatus.ACTIVE,
    },
  });

  logger.info('店家創建成功', { merchantId: merchant.id, merchantName: merchant.merchantName });

  return merchant as Merchant;
};

/**
 * 獲取店家詳情
 */
export const getMerchantById = async (merchantId: string): Promise<Merchant> => {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      user: {
        select: {
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  return merchant as Merchant;
};

/**
 * 根據用戶 ID 獲取店家
 */
export const getMerchantByUserId = async (userId: string): Promise<Merchant | null> => {
  const merchant = await prisma.merchant.findFirst({
    where: { userId },
  });

  return merchant as Merchant | null;
};

/**
 * 更新店家資料
 */
export const updateMerchant = async (
  merchantId: string,
  userId: string,
  data: UpdateMerchantDto
): Promise<Merchant> => {
  logger.info('更新店家資料', { merchantId, userId });

  // 驗證店家存在且屬於該用戶
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  if (merchant.userId !== userId) {
    throw new BusinessError(ErrorCode.FORBIDDEN, '無權修改此店家資料');
  }

  // 更新店家
  const updatedMerchant = await prisma.merchant.update({
    where: { id: merchantId },
    data,
  });

  logger.info('店家資料更新成功', { merchantId });

  return updatedMerchant as Merchant;
};

/**
 * 獲取店家統計資料
 */
export const getMerchantStats = async (merchantId: string): Promise<MerchantStats> => {
  logger.info('獲取店家統計', { merchantId });

  // 驗證店家存在
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 今日交易統計
  const todayPayments = await prisma.payment.findMany({
    where: {
      merchantId,
      status: 'COMPLETED',
      paidAt: { gte: todayStart },
    },
  });

  const todayTransactions = todayPayments.length;
  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.total, 0);

  // 本月交易統計
  const monthPayments = await prisma.payment.findMany({
    where: {
      merchantId,
      status: 'COMPLETED',
      paidAt: { gte: monthStart },
    },
  });

  const monthRevenue = monthPayments.reduce((sum, p) => sum + p.total, 0);

  // 總 TaxCoin 收入
  const allPayments = await prisma.payment.findMany({
    where: {
      merchantId,
      status: 'COMPLETED',
    },
  });

  const totalTaxCoinEarned = allPayments.reduce((sum, p) => sum + p.total, 0);

  return {
    todayTransactions,
    todayRevenue,
    monthRevenue,
    totalTaxCoinEarned,
  };
};

/**
 * 獲取所有店家列表（管理員用）
 */
export const getAllMerchants = async (params: {
  page?: number;
  limit?: number;
  status?: MerchantStatus;
}): Promise<{
  merchants: Merchant[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (params.status) {
    where.status = params.status;
  }

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true,
          },
        },
      },
    }),
    prisma.merchant.count({ where }),
  ]);

  return {
    merchants: merchants as Merchant[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 暫停/恢復店家（管理員用）
 */
export const updateMerchantStatus = async (
  merchantId: string,
  status: MerchantStatus
): Promise<Merchant> => {
  logger.info('更新店家狀態', { merchantId, status });

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  const updatedMerchant = await prisma.merchant.update({
    where: { id: merchantId },
    data: { status },
  });

  logger.info('店家狀態更新成功', { merchantId, status });

  return updatedMerchant as Merchant;
};
