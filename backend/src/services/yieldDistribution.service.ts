/**
 * 收益分配自動化服務
 *
 * 負責處理 RWA 投資池的收益計算與分配
 */

import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';
import { NotFoundError, ValidationError } from '@/utils/errors.js';

/**
 * 計算單一投資的當前收益
 *
 * @param investmentId - 投資 ID
 * @returns 當前累積收益金額
 */
export const calculateCurrentYield = async (investmentId: string): Promise<number> => {
  const investment = await prisma.investment.findUnique({
    where: { id: investmentId },
    include: {
      pool: true,
    },
  });

  if (!investment) {
    throw new NotFoundError('投資記錄不存在');
  }

  const { pool, investmentAmount, yieldRate, investedAt, redeemedAt } = investment;

  // 如果已經結算,返回已記錄的收益
  if (redeemedAt) {
    return investment.yieldAmount ? Number(investment.yieldAmount) : 0;
  }

  // 計算持有天數
  const startDate = new Date(investedAt);
  const endDate = pool.maturityDate < new Date() ? pool.maturityDate : new Date();
  const daysHeld = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // 計算收益: 投資金額 * 年化收益率 * (持有天數 / 365)
  const investmentAmountNum = Number(investmentAmount);
  const yieldRateNum = yieldRate ? Number(yieldRate) : Number(pool.yieldRate);
  const currentYield = (investmentAmountNum * (yieldRateNum / 100) * daysHeld) / 365;

  return Math.floor(currentYield);
};

/**
 * 分配單一投資池的收益給所有投資者
 *
 * @param poolId - 投資池 ID
 * @returns 分配結果統計
 */
export const distributePoolYield = async (poolId: string) => {
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
    include: {
      investments: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (pool.status !== 'RECRUITING' && pool.status !== 'MATURED') {
    throw new ValidationError('投資池狀態不允許分配收益');
  }

  let totalDistributed = 0;
  let investorCount = 0;

  // 對每個投資者計算並更新收益
  for (const investment of pool.investments) {
    try {
      const currentYield = await calculateCurrentYield(investment.id);

      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          yieldAmount: currentYield,
        },
      });

      totalDistributed += currentYield;
      investorCount++;

      logger.info(`收益分配成功 - 投資 ${investment.id}: ${currentYield} TWD`);
    } catch (error) {
      logger.error(`收益分配失敗 - 投資 ${investment.id}:`, error);
    }
  }

  // 記錄審計日誌
  await prisma.auditLog.create({
    data: {
      action: 'YIELD_DISTRIBUTION',
      entityType: 'RwaPool',
      entityId: poolId,
      details: {
        totalDistributed,
        investorCount,
        distributedAt: new Date().toISOString(),
      },
    },
  });

  return {
    poolId,
    poolName: pool.name,
    totalDistributed,
    investorCount,
  };
};

/**
 * 分配所有活躍投資池的收益
 *
 * @returns 分配結果統計
 */
export const distributeAllYields = async () => {
  const activePools = await prisma.rwaPool.findMany({
    where: {
      status: {
        in: ['RECRUITING', 'MATURED'],
      },
    },
  });

  logger.info(`開始分配收益 - 共 ${activePools.length} 個活躍投資池`);

  const results = [];
  let totalDistributed = 0;
  let totalInvestors = 0;

  for (const pool of activePools) {
    try {
      const result = await distributePoolYield(pool.id);
      results.push(result);
      totalDistributed += result.totalDistributed;
      totalInvestors += result.investorCount;
    } catch (error) {
      logger.error(`投資池 ${pool.id} 收益分配失敗:`, error);
    }
  }

  logger.info(`收益分配完成 - 總金額: ${totalDistributed} TWD, 投資者數: ${totalInvestors}`);

  return {
    totalPools: activePools.length,
    totalDistributed,
    totalInvestors,
    results,
    distributedAt: new Date(),
  };
};

/**
 * 結算已到期的投資
 *
 * @param investmentId - 投資 ID
 * @returns 結算結果
 */
export const settleMaturedInvestment = async (investmentId: string) => {
  const investment = await prisma.investment.findUnique({
    where: { id: investmentId },
    include: {
      pool: true,
      user: true,
    },
  });

  if (!investment) {
    throw new NotFoundError('投資記錄不存在');
  }

  if (investment.status !== 'ACTIVE') {
    throw new ValidationError('投資狀態不允許結算');
  }

  const now = new Date();
  if (investment.pool.maturityDate > now) {
    throw new ValidationError('投資尚未到期');
  }

  // 計算最終收益
  const finalYield = await calculateCurrentYield(investmentId);

  // 更新投資狀態為已結算
  const settledInvestment = await prisma.investment.update({
    where: { id: investmentId },
    data: {
      status: 'REDEEMED',
      yieldAmount: finalYield,
      redeemedAt: now,
    },
  });

  // 創建通知
  await prisma.notification.create({
    data: {
      userId: investment.userId,
      title: '投資已結算',
      message: `您在「${investment.pool.name}」的投資已到期結算,收益金額為 ${finalYield} TWD`,
      type: 'INVESTMENT_SETTLED',
    },
  });

  // 記錄審計日誌
  await prisma.auditLog.create({
    data: {
      action: 'INVESTMENT_SETTLEMENT',
      entityType: 'Investment',
      entityId: investmentId,
      userId: investment.userId,
      details: {
        poolId: investment.poolId,
        investmentAmount: investment.investmentAmount,
        finalYield,
        settledAt: now.toISOString(),
      },
    },
  });

  logger.info(`投資結算成功 - ${investmentId}: 本金 ${investment.investmentAmount} + 收益 ${finalYield} TWD`);

  return {
    investmentId: settledInvestment.id,
    poolName: investment.pool.name,
    investmentAmount: Number(settledInvestment.investmentAmount),
    finalYield,
    totalAmount: Number(settledInvestment.investmentAmount) + finalYield,
    settledAt: now,
  };
};

/**
 * 結算所有已到期的投資
 *
 * @returns 結算結果統計
 */
export const settleAllMaturedInvestments = async () => {
  const now = new Date();

  // 查找所有已到期但尚未結算的投資
  const maturedInvestments = await prisma.investment.findMany({
    where: {
      status: 'ACTIVE',
      pool: {
        maturityDate: {
          lte: now,
        },
      },
    },
    include: {
      pool: true,
    },
  });

  logger.info(`開始結算到期投資 - 共 ${maturedInvestments.length} 筆`);

  const results = [];
  let totalSettled = 0;
  let totalYield = 0;

  for (const investment of maturedInvestments) {
    try {
      const result = await settleMaturedInvestment(investment.id);
      results.push(result);
      totalSettled += Number(result.investmentAmount);
      totalYield += Number(result.finalYield);
    } catch (error) {
      logger.error(`投資 ${investment.id} 結算失敗:`, error);
    }
  }

  // 更新已到期投資池的狀態
  await prisma.rwaPool.updateMany({
    where: {
      maturityDate: {
        lte: now,
      },
      status: {
        not: 'MATURED',
      },
    },
    data: {
      status: 'MATURED',
    },
  });

  logger.info(`到期投資結算完成 - 總本金: ${totalSettled} TWD, 總收益: ${totalYield} TWD`);

  return {
    totalInvestments: maturedInvestments.length,
    totalSettled,
    totalYield,
    results,
    settledAt: now,
  };
};

/**
 * 獲取投資池的收益分配歷史
 *
 * @param poolId - 投資池 ID
 * @param limit - 限制返回數量
 * @returns 分配歷史記錄
 */
export const getYieldDistributionHistory = async (poolId: string, limit: number = 10) => {
  const history = await prisma.auditLog.findMany({
    where: {
      action: 'YIELD_DISTRIBUTION',
      entityType: 'RwaPool',
      entityId: poolId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return history;
};
