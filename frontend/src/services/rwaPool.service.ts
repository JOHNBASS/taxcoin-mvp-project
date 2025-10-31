import apiClient, { extractErrorMessage, buildQueryString } from './api';
import type {
  RwaPool,
  Investment,
  InvestRequest,
  PoolListResponse,
  PaginatedResponse,
} from '../types';

/**
 * RWA 投資池服務
 */
class RwaPoolService {
  /**
   * 獲取所有投資池
   */
  async getPools(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PoolListResponse> {
    try {
      const queryString = buildQueryString(params || {});
      const response = await apiClient.get<any>(`/rwa-pools${queryString}`);
      // Backend returns { success: true, data: { pools, pagination } }
      const result = response.data.data || response.data;
      const pools = (result.pools || []).map((pool: any) => ({
        ...pool,
        name: pool.name || pool.poolName, // Ensure name field exists
        investorCount: pool.investorCount || 0,
      }));
      return {
        data: pools,
        pagination: result.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 獲取投資池詳情
   */
  async getPoolById(id: string): Promise<RwaPool> {
    try {
      const response = await apiClient.get<any>(`/rwa-pools/${id}`);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 投資到指定池
   */
  async invest(poolId: string, data: InvestRequest): Promise<Investment> {
    try {
      const response = await apiClient.post<any>(`/rwa-pools/${poolId}/invest`, data);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 獲取我的投資列表
   */
  async getMyInvestments(params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Investment>> {
    try {
      const queryString = buildQueryString(params || {});
      const response = await apiClient.get<any>(
        `/rwa-pools/my-investments${queryString}`
      );
      // Backend returns { success: true, data: { investments: [...], pagination: {...} } }
      const result = response.data.data || response.data;
      return {
        data: result.investments || [],
        pagination: result.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 }
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 創建投資池
   */
  async createPool(data: {
    name: string;
    description: string;
    sharePrice: number;
    totalShares: number;
    yieldRate: number;
    maturityDays: number;
    riskLevel: string;
  }): Promise<RwaPool> {
    try {
      // 計算目標金額和到期日
      const targetAmount = data.sharePrice * data.totalShares;
      const maturityDate = new Date();
      maturityDate.setDate(maturityDate.getDate() + data.maturityDays);

      // 轉換為後端期望的格式
      const backendData = {
        poolName: data.name,
        targetAmount: targetAmount,
        yieldRate: data.yieldRate,
        maturityDate: maturityDate.toISOString(),
        totalTokenSupply: data.totalShares,
      };

      const response = await apiClient.post<any>('/rwa-pools/admin/create', backendData);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 獲取統計資料
   */
  async getStats(): Promise<{
    totalPools: number;
    activePools: number;
    totalValue: number;
    totalInvested: number;
    averageFillRate: number;
    averageYield: number;
  }> {
    try {
      const response = await apiClient.get('/rwa-pools/admin/stats');
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 手動觸發池狀態更新（測試用）
   */
  async checkPoolStatus(poolId: string): Promise<{ txHash: string }> {
    try {
      const response = await apiClient.post(`/rwa-pools/admin/${poolId}/check-status`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 結算投資池
   */
  async settlePool(poolId: string): Promise<{
    txHash?: string;
    totalYield?: number;
    message: string;
  }> {
    try {
      const response = await apiClient.post(`/rwa-pools/admin/${poolId}/settle`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 投資者 - 構建領取收益交易
   */
  async buildClaimTransaction(poolId: string, walletAddress: string): Promise<{
    transactionBytes: string; // Base64 字符串
    poolAddress: string;
    poolShareNftId: string;
    expectedPrincipal: number;
    expectedYield: number;
    expectedTotal: number;
  }> {
    try {
      const response = await apiClient.post(`/rwa-pools/${poolId}/build-claim-transaction`, {
        walletAddress,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 投資者 - 確認領取收益完成
   */
  async confirmClaimYield(poolId: string, transactionHash: string): Promise<void> {
    try {
      await apiClient.post(`/rwa-pools/${poolId}/confirm-claim`, {
        transactionHash,
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 修改投資池到期日（測試用）
   */
  async updateMaturityDate(poolId: string, newMaturityDate: Date): Promise<{ txHash: string; message: string }> {
    try {
      const response = await apiClient.post(`/rwa-pools/admin/${poolId}/update-maturity-date`, {
        maturityDate: newMaturityDate.toISOString(),
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 更新池狀態到 MATURED（測試用）
   */
  async updateStatusToMatured(poolId: string): Promise<{ txHash: string; message: string }> {
    try {
      const response = await apiClient.post(`/rwa-pools/admin/${poolId}/update-status-to-matured`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 注入收益到投資池
   */
  async depositYield(poolId: string, yieldAmount: number): Promise<{ txHash: string; message: string }> {
    try {
      const response = await apiClient.post(`/rwa-pools/admin/${poolId}/deposit-yield`, {
        yieldAmount,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}

export default new RwaPoolService();
