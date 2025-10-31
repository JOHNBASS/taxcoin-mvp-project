/**
 * TAXCOIN 工具函数
 * 匯率：1 TAXCOIN = 1 TWD
 */

/**
 * TAXCOIN (最小單位) 轉換為 TWD
 * @param taxcoinAmount - TAXCOIN 最小單位數量 (10^8)
 * @returns TWD 金額
 */
export const taxcoinToTwd = (taxcoinAmount: number): number => {
  // 1 TWD = 1 TAXCOIN = 10^8 smallest units
  return taxcoinAmount / 1e8;
};

/**
 * TWD 轉換為 TAXCOIN (最小單位)
 * @param twdAmount - TWD 金額
 * @returns TAXCOIN 最小單位數量
 */
export const twdToTaxcoin = (twdAmount: number): number => {
  return twdAmount * 1e8;
};

/**
 * 格式化 TAXCOIN 數量 (顯示完整單位)
 * @param taxcoinAmount - TAXCOIN 最小單位數量 (10^8)
 * @returns 格式化的 TAXCOIN 字串
 */
export const formatTaxcoin = (taxcoinAmount: number): string => {
  const taxcoin = taxcoinAmount / 1e8;
  return taxcoin.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  });
};

/**
 * 格式化 TWD 金額
 * @param taxcoinAmount - TAXCOIN 最小單位數量 (10^8)
 * @returns 格式化的 TWD 字串
 */
export const formatTwd = (taxcoinAmount: number): string => {
  const twd = taxcoinToTwd(taxcoinAmount);
  return twd.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * 格式化 TAXCOIN 並顯示等值 TWD
 * @param taxcoinAmount - TAXCOIN 最小單位數量 (10^8)
 * @returns 格式化的字串 "X TAXCOIN (≈ Y TWD)"
 */
export const formatTaxcoinWithTwd = (taxcoinAmount: number): string => {
  const taxcoin = formatTaxcoin(taxcoinAmount);
  const twd = formatTwd(taxcoinAmount);
  return `${taxcoin} TAXCOIN (≈ ${twd} TWD)`;
};

/**
 * 計算 TAXCOIN 數量 (從退稅金額)
 * @param taxAmountTwd - 退稅金額 (TWD)
 * @returns TAXCOIN 數量 (完整單位, not smallest unit)
 */
export const calculateTaxcoinAmount = (taxAmountTwd: number): number => {
  // 1 TWD = 1 TAXCOIN
  return taxAmountTwd;
};

/**
 * 計算 TAXCOIN 最小單位 (從退稅金額)
 * @param taxAmountTwd - 退稅金額 (TWD)
 * @returns TAXCOIN 最小單位數量
 */
export const calculateTaxcoinSmallestUnit = (taxAmountTwd: number): number => {
  // 1 TWD = 1 TAXCOIN = 10^8 smallest units
  return Math.floor(taxAmountTwd * 1e8);
};
