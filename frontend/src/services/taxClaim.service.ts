import apiClient, { formDataClient, extractErrorMessage, buildQueryString } from './api';
import type {
  TaxClaim,
  TaxClaimListResponse,
  CreateTaxClaimRequest,
} from '../types';

/**
 * 退稅申請服務
 */
class TaxClaimService {
  /**
   * 創建退稅申請 (上傳收據)
   */
  async createClaim(data: CreateTaxClaimRequest & {
    manualData?: {
      merchantName: string;
      purchaseDate: string;
      totalAmount: number;
      entryFlight?: string;
      entryFlightDate?: string;
      exitFlight?: string;
      exitFlightDate?: string;
    };
  }): Promise<TaxClaim> {
    try {
      const formData = new FormData();
      data.receipts.forEach((file) => {
        formData.append('receipts', file);
      });

      // 如果有手动输入的数据，添加到 formData
      if (data.manualData) {
        formData.append('manualData', JSON.stringify(data.manualData));
      }

      const response = await formDataClient.post<any>('/tax-claims', formData);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 獲取我的退稅申請列表
   */
  async getMyClaims(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<TaxClaimListResponse> {
    try {
      const queryString = buildQueryString(params || {});
      const response = await apiClient.get<any>(`/tax-claims${queryString}`);
      // Backend returns { success: true, data: { claims, pagination } }
      const result = response.data.data || response.data;
      const claimsArray = result?.claims || [];
      return {
        data: Array.isArray(claimsArray) ? claimsArray : [],
        pagination: result?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      };
    } catch (error) {
      console.error('Failed to fetch tax claims:', error);
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 獲取退稅申請詳情
   */
  async getClaimById(id: string): Promise<TaxClaim> {
    try {
      const response = await apiClient.get<any>(`/tax-claims/${id}`);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 獲取所有退稅申請
   */
  async getAllClaims(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }): Promise<TaxClaimListResponse> {
    try {
      const queryString = buildQueryString(params || {});
      const response = await apiClient.get<any>(`/tax-claims/admin/all${queryString}`);
      // Backend returns { success: true, data: { claims, pagination } }
      const result = response.data.data || response.data;
      const claimsArray = result?.claims || [];
      return {
        data: Array.isArray(claimsArray) ? claimsArray : [],
        pagination: result?.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      };
    } catch (error) {
      console.error('Failed to fetch all tax claims:', error);
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 審核退稅申請
   */
  async reviewClaim(
    id: string,
    data: {
      action: 'approve' | 'reject';
      notes?: string;
    }
  ): Promise<TaxClaim> {
    try {
      // Transform frontend format to backend format
      const backendData = {
        status: data.action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectedReason: data.notes,
      };
      const response = await apiClient.patch<any>(`/tax-claims/admin/${id}/review`, backendData);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 獲取統計資料
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    totalTax: number;
  }> {
    try {
      const response = await apiClient.get('/tax-claims/admin/stats');
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 手動發放 Token 和 NFT
   */
  async disburseTokens(id: string): Promise<{
    txHash: string;
    nftObjectId: string;
    taxCoinAmount: number;
    status: string;
  }> {
    try {
      const response = await apiClient.post<any>(`/tax-claims/admin/${id}/disburse`);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 緊急轉移 NFT（靈魂綁定 NFT 特殊轉移）
   */
  async emergencyTransferNFT(
    id: string,
    data: {
      newOwner: string;
      reason: string;
    }
  ): Promise<{
    txHash: string;
    newOwner: string;
  }> {
    try {
      const response = await apiClient.post<any>(`/tax-claims/admin/${id}/emergency-transfer`, data);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}

export default new TaxClaimService();
