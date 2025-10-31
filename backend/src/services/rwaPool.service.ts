import { logger } from '@/utils/logger.js';
import { prisma } from '@/utils/prisma.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';

/**
 * 計算池的當前填充率
 * @param currentAmount - 當前金額
 * @param targetAmount - 目標金額
 * @returns 填充率百分比 (0-100)
 */
export const calculateFillRate = (
  currentAmount: number,
  targetAmount: number
): number => {
  if (targetAmount === 0) return 0;
  return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
};

/**
 * 計算投資者應獲得的代幣數量
 * @param investmentAmount - 投資金額
 * @param totalSupply - 代幣總供應量
 * @param targetAmount - 池的目標金額
 * @returns 代幣數量
 */
export const calculateTokenAmount = (
  investmentAmount: number,
  totalSupply: number,
  targetAmount: number
): number => {
  if (targetAmount === 0) return 0;

  // 按投資金額比例分配代幣
  const ratio = investmentAmount / targetAmount;
  const tokenAmount = totalSupply * ratio;

  return Math.floor(tokenAmount * 100000000) / 100000000; // 保留 8 位小數
};

/**
 * 計算預期收益
 * @param investmentAmount - 投資金額
 * @param yieldRate - 年化收益率 (%)
 * @param daysToMaturity - 距離到期天數
 * @returns 預期收益金額
 */
export const calculateExpectedYield = (
  investmentAmount: number,
  yieldRate: number,
  daysToMaturity: number
): number => {
  // 年化收益率轉換為期間收益率
  const yearlyYield = investmentAmount * (yieldRate / 100);
  const periodYield = (yearlyYield / 365) * daysToMaturity;

  return Math.round(periodYield * 100) / 100; // 四捨五入到小數點後兩位
};

/**
 * 檢查投資池是否可投資
 * @param poolId - 池 ID
 * @returns 是否可投資
 */
export const checkPoolAvailability = async (
  poolId: string
): Promise<{ available: boolean; reason?: string }> => {
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    return { available: false, reason: '投資池不存在' };
  }

  // 檢查狀態
  if (pool.status !== 'RECRUITING') {
    return { available: false, reason: `投資池狀態為: ${pool.status}` };
  }

  // 檢查是否已滿額
  if (Number(pool.currentAmount) >= Number(pool.targetAmount)) {
    return { available: false, reason: '投資池已滿額' };
  }

  // 檢查是否已過期
  if (pool.maturityDate < new Date()) {
    return { available: false, reason: '投資池已到期' };
  }

  return { available: true };
};

/**
 * 更新投資池狀態
 * @param poolId - 池 ID
 */
export const updatePoolStatus = async (poolId: string): Promise<void> => {
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '投資池不存在');
  }

  // ⚠️ 不要更新已結算的投資池狀態
  if (pool.status === 'SETTLED') {
    logger.debug('投資池已結算，跳過狀態更新', { poolId, status: 'SETTLED' });
    return;
  }

  let newStatus = pool.status;

  // 檢查是否已滿額
  if (Number(pool.currentAmount) >= Number(pool.targetAmount)) {
    newStatus = 'FULL';
  }
  // 檢查是否已到期
  else if (pool.maturityDate < new Date()) {
    newStatus = 'MATURED';
  }

  // 如果狀態有變化,更新
  if (newStatus !== pool.status) {
    await prisma.rwaPool.update({
      where: { id: poolId },
      data: { status: newStatus },
    });

    logger.info('投資池狀態更新', {
      poolId,
      oldStatus: pool.status,
      newStatus,
    });
  }
};

/**
 * 添加退稅債權到池中
 * @param poolId - 池 ID
 * @param taxClaimId - 退稅申請 ID
 */
export const addTaxClaimToPool = async (
  poolId: string,
  taxClaimId: string
): Promise<void> => {
  // 檢查退稅申請是否存在且已核准
  const taxClaim = await prisma.taxClaim.findUnique({
    where: { id: taxClaimId },
  });

  if (!taxClaim) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '退稅申請不存在');
  }

  if (taxClaim.status !== 'APPROVED') {
    throw new BusinessError(
      ErrorCode.VALIDATION_ERROR,
      '僅已核准的退稅申請可加入池中'
    );
  }

  // 檢查是否已在其他池中
  const existingItem = await prisma.rwaPoolItem.findUnique({
    where: { taxClaimId },
  });

  if (existingItem) {
    throw new BusinessError(
      ErrorCode.ALREADY_EXISTS,
      '該退稅申請已在投資池中'
    );
  }

  // 添加到池中
  await prisma.rwaPoolItem.create({
    data: {
      poolId,
      taxClaimId,
    },
  });

  logger.info('退稅債權已加入池', {
    poolId,
    taxClaimId,
    amount: taxClaim.taxAmount,
  });
};

/**
 * 計算池的總價值 (所有債權的總和)
 * @param poolId - 池 ID
 * @returns 總價值
 */
export const calculatePoolValue = async (
  poolId: string
): Promise<number> => {
  const items = await prisma.rwaPoolItem.findMany({
    where: { poolId },
    include: { taxClaim: true },
  });

  const totalValue = items.reduce(
    (sum, item) => sum + Number(item.taxClaim.taxAmount),
    0
  );

  return totalValue;
};

/**
 * 計算距離到期的天數
 * @param maturityDate - 到期日期
 * @returns 天數
 */
export const calculateDaysToMaturity = (maturityDate: Date): number => {
  const now = new Date();
  const diffTime = maturityDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(diffDays, 0);
};

/**
 * 驗證投資金額
 * @param amount - 投資金額
 * @param poolId - 池 ID
 * @returns 是否有效
 */
export const validateInvestmentAmount = async (
  amount: number,
  poolId: string
): Promise<{ valid: boolean; reason?: string }> => {
  // 最低投資金額 1000 TWD
  const MIN_INVESTMENT = 1000;

  if (amount < MIN_INVESTMENT) {
    return {
      valid: false,
      reason: `最低投資金額為 ${MIN_INVESTMENT} TWD`,
    };
  }

  // 檢查池的剩餘額度
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    return { valid: false, reason: '投資池不存在' };
  }

  const remaining = Number(pool.targetAmount) - Number(pool.currentAmount);

  if (amount > remaining) {
    return {
      valid: false,
      reason: `超過剩餘額度 ${remaining} TWD`,
    };
  }

  return { valid: true };
};
