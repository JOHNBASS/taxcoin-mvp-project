import apiClient, { extractErrorMessage } from './api';
import type {
  LiquidityPool,
  LPToken,
  SwapQuote,
  SwapRequest,
  AddLiquidityRequest,
  RemoveLiquidityRequest,
  PriceHistory,
  ExchangeStats,
} from '../types';

/**
 * Exchange 兑换服务
 */
class ExchangeService {
  /**
   * 获取流动性池信息
   */
  async getPool(): Promise<LiquidityPool> {
    try {
      const response = await apiClient.get<any>('/exchange/pool');
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 获取兑换报价
   */
  async getSwapQuote(
    inputToken: 'SUI' | 'TAXCOIN',
    outputToken: 'SUI' | 'TAXCOIN',
    inputAmount: number
  ): Promise<SwapQuote> {
    try {
      const response = await apiClient.post<any>('/exchange/quote', {
        inputToken,
        outputToken,
        inputAmount,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 执行兑换
   */
  async swap(data: SwapRequest): Promise<{
    txHash: string;
    outputAmount: number;
  }> {
    try {
      const response = await apiClient.post<any>('/exchange/swap', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 添加流动性
   */
  async addLiquidity(data: AddLiquidityRequest): Promise<{
    lpTokenId: string;
    lpAmount: number;
    txHash: string;
  }> {
    try {
      const response = await apiClient.post<any>('/exchange/liquidity/add', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 移除流动性
   */
  async removeLiquidity(data: RemoveLiquidityRequest): Promise<{
    suiAmount: number;
    taxcoinAmount: number;
    txHash: string;
  }> {
    try {
      const response = await apiClient.post<any>('/exchange/liquidity/remove', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 获取我的 LP Tokens
   */
  async getMyLPTokens(): Promise<LPToken[]> {
    try {
      const response = await apiClient.get<any>('/exchange/my-lp-tokens');
      return response.data.data || [];
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 获取价格历史
   */
  async getPriceHistory(
    period: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<PriceHistory[]> {
    try {
      const response = await apiClient.get<any>(`/exchange/price-history?period=${period}`);
      return response.data.data || [];
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 获取交易统计
   */
  async getStats(): Promise<ExchangeStats> {
    try {
      const response = await apiClient.get<any>('/exchange/stats');
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 计算输出金额 (客户端计算,不依赖后端)
   */
  calculateOutputAmount(
    inputAmount: number,
    inputReserve: number,
    outputReserve: number
  ): { outputAmount: number; fee: number } {
    const FEE_RATE = 30; // 0.3%
    const FEE_DENOMINATOR = 10000;

    const fee = (inputAmount * FEE_RATE) / FEE_DENOMINATOR;
    const inputAfterFee = inputAmount - fee;

    const numerator = inputAfterFee * outputReserve;
    const denominator = inputReserve + inputAfterFee;
    const outputAmount = Math.floor(numerator / denominator);

    return { outputAmount, fee };
  }

  /**
   * 计算价格影响
   */
  calculatePriceImpact(
    inputAmount: number,
    inputReserve: number,
    outputReserve: number
  ): number {
    const currentPrice = outputReserve / inputReserve;
    const { outputAmount } = this.calculateOutputAmount(
      inputAmount,
      inputReserve,
      outputReserve
    );
    const executionPrice = outputAmount / inputAmount;
    const priceImpact = ((currentPrice - executionPrice) / currentPrice) * 100;
    return Math.abs(priceImpact);
  }

  /**
   * 计算滑点保护的最小输出
   */
  calculateMinimumReceived(
    outputAmount: number,
    slippageTolerance: number
  ): number {
    return Math.floor(outputAmount * (1 - slippageTolerance / 100));
  }

  /**
   * 格式化金额 (SUI 9位小数, TAXCOIN 8位小数)
   */
  formatAmount(amount: number, token: 'SUI' | 'TAXCOIN'): string {
    const decimals = token === 'SUI' ? 9 : 8;
    return (amount / Math.pow(10, decimals)).toFixed(decimals);
  }

  /**
   * 解析金额 (将用户输入转换为最小单位)
   */
  parseAmount(amount: string | number, token: 'SUI' | 'TAXCOIN'): number {
    const decimals = token === 'SUI' ? 9 : 8;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return Math.floor(num * Math.pow(10, decimals));
  }

  /**
   * TAXCOIN 转换为 TWD
   * 1 TAXCOIN = 1 TWD
   */
  taxcoinToTwd(taxcoinAmount: number): number {
    // taxcoinAmount 是最小单位 (10^8)
    // 1 TWD = 1 TAXCOIN = 10^8 smallest units
    return taxcoinAmount / 1e8;
  }

  /**
   * TWD 转换为 TAXCOIN
   * 1 TWD = 1 TAXCOIN
   */
  twdToTaxcoin(twdAmount: number): number {
    // 返回最小单位
    return twdAmount * 1e8;
  }

  /**
   * 格式化 TWD 金额
   */
  formatTwd(taxcoinAmount: number): string {
    const twd = this.taxcoinToTwd(taxcoinAmount);
    return twd.toLocaleString('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * 格式化 TAXCOIN 金额并显示等值 TWD
   */
  formatTaxcoinWithTwd(taxcoinAmount: number): string {
    const taxcoin = this.formatAmount(taxcoinAmount, 'TAXCOIN');
    const twd = this.formatTwd(taxcoinAmount);
    return `${taxcoin} TAXCOIN (≈ ${twd} TWD)`;
  }
}

export default new ExchangeService();
