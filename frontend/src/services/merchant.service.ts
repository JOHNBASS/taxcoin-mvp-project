/**
 * Merchant API Service
 * 店家相關 API 請求
 */

import apiClient, { extractErrorMessage } from './api';
import type {
  Merchant,
  CreateMerchantDto,
  UpdateMerchantDto,
  MerchantStats,
} from '@/types/payment';

export const merchantService = {
  /**
   * 創建店家
   */
  async createMerchant(data: CreateMerchantDto): Promise<Merchant> {
    try {
      const response = await apiClient.post('/merchants', data);
      return response.data.data.merchant;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取當前用戶的店家資訊
   */
  async getMyMerchant(): Promise<Merchant> {
    try {
      const response = await apiClient.get('/merchants/my/profile');
      return response.data.data.merchant;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取店家詳情
   */
  async getMerchantById(merchantId: string): Promise<Merchant> {
    try {
      const response = await apiClient.get(`/merchants/${merchantId}`);
      return response.data.data.merchant;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 更新店家資訊
   */
  async updateMerchant(merchantId: string, data: UpdateMerchantDto): Promise<Merchant> {
    try {
      const response = await apiClient.put(`/merchants/${merchantId}`, data);
      return response.data.data.merchant;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取店家統計數據
   */
  async getMerchantStats(merchantId: string): Promise<MerchantStats> {
    try {
      const response = await apiClient.get(`/merchants/${merchantId}/stats`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取所有店家（管理員）
   */
  async getAllMerchants(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    merchants: Merchant[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const response = await apiClient.get('/merchants', { params });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 更新店家狀態（管理員）
   */
  async updateMerchantStatus(
    merchantId: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Promise<Merchant> {
    try {
      const response = await apiClient.patch(
        `/merchants/${merchantId}/status`,
        { status }
      );
      return response.data.data.merchant;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};
