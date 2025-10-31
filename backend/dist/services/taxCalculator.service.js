import { logger } from '../utils/logger.js';
import { prisma } from '../utils/prisma.js';
const DEFAULT_TAX_RATE = 0.05;
export const calculateTaxAmount = async (originalAmount) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'tax_rate' },
        });
        let taxRate = DEFAULT_TAX_RATE;
        if (config) {
            const configValue = JSON.parse(config.value);
            taxRate = configValue.rate || DEFAULT_TAX_RATE;
        }
        const taxAmount = originalAmount * taxRate;
        logger.debug('計算退稅金額', {
            originalAmount,
            taxRate,
            taxAmount,
        });
        return Math.round(taxAmount * 100) / 100;
    }
    catch (error) {
        logger.error('計算退稅金額失敗', { error, originalAmount });
        return Math.round(originalAmount * DEFAULT_TAX_RATE * 100) / 100;
    }
};
export const calculateTaxCoinAmount = (taxAmount) => {
    return taxAmount;
};
export const checkMinimumAmount = async (amount) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: 'min_claim_amount' },
        });
        let minAmount = 100;
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
    }
    catch (error) {
        logger.error('檢查最低消費金額失敗', { error });
        return amount >= 100;
    }
};
export const validateTaxCalculation = (originalAmount, taxAmount) => {
    if (taxAmount < 0) {
        return false;
    }
    if (taxAmount > originalAmount) {
        return false;
    }
    if (taxAmount > originalAmount * 0.2) {
        logger.warn('退稅金額過高', { originalAmount, taxAmount });
        return false;
    }
    return true;
};
//# sourceMappingURL=taxCalculator.service.js.map