import { logger } from '@/utils/logger.js';
import { prisma } from '@/utils/prisma.js';

/**
 * 退稅率配置 (可從系統配置讀取)
 */
const DEFAULT_TAX_RATE = 0.05; // 5% 退稅率

/**
 * 計算退稅金額
 * @param originalAmount - 原始消費金額
 * @returns 退稅金額
 */
export const calculateTaxAmount = async (
  originalAmount: number
): Promise<number> => {
  try {
    // 從系統配置讀取退稅率
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'tax_rate' },
    });

    let taxRate = DEFAULT_TAX_RATE;

    if (config) {
      const configValue = JSON.parse(config.value);
      taxRate = configValue.rate || DEFAULT_TAX_RATE;
    }

    // 計算退稅金額
    const taxAmount = originalAmount * taxRate;

    logger.debug('計算退稅金額', {
      originalAmount,
      taxRate,
      taxAmount,
    });

    return Math.round(taxAmount * 100) / 100; // 四捨五入到小數點後兩位
  } catch (error) {
    logger.error('計算退稅金額失敗', { error, originalAmount });
    // 降級使用預設退稅率
    return Math.round(originalAmount * DEFAULT_TAX_RATE * 100) / 100;
  }
};

/**
 * 計算 TaxCoin 數量 (1:1 對應退稅金額)
 * @param taxAmount - 退稅金額 (TWD)
 * @returns TaxCoin 數量
 */
export const calculateTaxCoinAmount = (taxAmount: number): number => {
  // 設計為 1 TWD = 1 TaxCoin
  return taxAmount;
};

/**
 * 檢查消費金額是否符合退稅門檻
 * @param amount - 消費金額
 * @returns 是否符合門檻
 */
export const checkMinimumAmount = async (
  amount: number
): Promise<boolean> => {
  try {
    // 從系統配置讀取最低消費金額
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'min_claim_amount' },
    });

    let minAmount = 100; // 預設最低 100 TWD

    if (config) {
      const configValue = JSON.parse(config.value);
      minAmount = configValue.amount || 100;
    }

    const isValid = amount >= minAmount;

    logger.debug('檢查最低消費金額', {
      amount,
      minAmount,
      isValid,
    });

    return isValid;
  } catch (error) {
    logger.error('檢查最低消費金額失敗', { error });
    return amount >= 100; // 降級使用預設值
  }
};

/**
 * 驗證退稅計算結果
 * @param originalAmount - 原始金額
 * @param taxAmount - 退稅金額
 * @returns 是否有效
 */
export const validateTaxCalculation = (
  originalAmount: number,
  taxAmount: number
): boolean => {
  // 退稅金額不能為負數
  if (taxAmount < 0) {
    return false;
  }

  // 退稅金額不能超過原始金額
  if (taxAmount > originalAmount) {
    return false;
  }

  // 退稅金額應該合理 (不超過原始金額的 20%)
  if (taxAmount > originalAmount * 0.2) {
    logger.warn('退稅金額過高', { originalAmount, taxAmount });
    return false;
  }

  return true;
};
