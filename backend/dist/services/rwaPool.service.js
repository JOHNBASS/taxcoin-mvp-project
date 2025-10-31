import { logger } from '../utils/logger.js';
import { prisma } from '../utils/prisma.js';
import { BusinessError } from '../utils/errors.js';
import { ErrorCode } from '../types/index.js';
export const calculateFillRate = (currentAmount, targetAmount) => {
    if (targetAmount === 0)
        return 0;
    return Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
};
export const calculateTokenAmount = (investmentAmount, totalSupply, targetAmount) => {
    if (targetAmount === 0)
        return 0;
    const ratio = investmentAmount / targetAmount;
    const tokenAmount = totalSupply * ratio;
    return Math.floor(tokenAmount * 100000000) / 100000000;
};
export const calculateExpectedYield = (investmentAmount, yieldRate, daysToMaturity) => {
    const yearlyYield = investmentAmount * (yieldRate / 100);
    const periodYield = (yearlyYield / 365) * daysToMaturity;
    return Math.round(periodYield * 100) / 100;
};
export const checkPoolAvailability = async (poolId) => {
    const pool = await prisma.rwaPool.findUnique({
        where: { id: poolId },
    });
    if (!pool) {
        return { available: false, reason: '投資池不存在' };
    }
    if (pool.status !== 'RECRUITING') {
        return { available: false, reason: `投資池狀態為: ${pool.status}` };
    }
    if (Number(pool.currentAmount) >= Number(pool.targetAmount)) {
        return { available: false, reason: '投資池已滿額' };
    }
    if (pool.maturityDate < new Date()) {
        return { available: false, reason: '投資池已到期' };
    }
    return { available: true };
};
export const updatePoolStatus = async (poolId) => {
    const pool = await prisma.rwaPool.findUnique({
        where: { id: poolId },
    });
    if (!pool) {
        throw new BusinessError(ErrorCode.NOT_FOUND, '投資池不存在');
    }
    let newStatus = pool.status;
    if (Number(pool.currentAmount) >= Number(pool.targetAmount)) {
        newStatus = 'FULL';
    }
    else if (pool.maturityDate < new Date()) {
        newStatus = 'MATURED';
    }
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
export const addTaxClaimToPool = async (poolId, taxClaimId) => {
    const taxClaim = await prisma.taxClaim.findUnique({
        where: { id: taxClaimId },
    });
    if (!taxClaim) {
        throw new BusinessError(ErrorCode.NOT_FOUND, '退稅申請不存在');
    }
    if (taxClaim.status !== 'APPROVED') {
        throw new BusinessError(ErrorCode.VALIDATION_ERROR, '僅已核准的退稅申請可加入池中');
    }
    const existingItem = await prisma.rwaPoolItem.findUnique({
        where: { taxClaimId },
    });
    if (existingItem) {
        throw new BusinessError(ErrorCode.ALREADY_EXISTS, '該退稅申請已在投資池中');
    }
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
export const calculatePoolValue = async (poolId) => {
    const items = await prisma.rwaPoolItem.findMany({
        where: { poolId },
        include: { taxClaim: true },
    });
    const totalValue = items.reduce((sum, item) => sum + Number(item.taxClaim.taxAmount), 0);
    return totalValue;
};
export const calculateDaysToMaturity = (maturityDate) => {
    const now = new Date();
    const diffTime = maturityDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
};
export const validateInvestmentAmount = async (amount, poolId) => {
    const MIN_INVESTMENT = 1000;
    if (amount < MIN_INVESTMENT) {
        return {
            valid: false,
            reason: `最低投資金額為 ${MIN_INVESTMENT} TWD`,
        };
    }
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
//# sourceMappingURL=rwaPool.service.js.map