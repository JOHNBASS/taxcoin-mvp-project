import { formDataClient, extractErrorMessage } from './api';
import apiClient from './api';
import type { KycRecord, SubmitKycRequest, VerifiableCredential } from '../types';

/**
 * KYC 驗證服務
 */
class KycService {
  /**
   * 提交 KYC 申請
   */
  async submitKyc(data: SubmitKycRequest & {
    passportNumber?: string;
    fullName?: string;
    nationality?: string;
  }): Promise<KycRecord> {
    try {
      const formData = new FormData();
      formData.append('passport', data.passport);
      formData.append('face', data.selfie);

      // 添加手動輸入的資料
      if (data.passportNumber) {
        formData.append('passportNumber', data.passportNumber);
      }
      if (data.fullName) {
        formData.append('fullName', data.fullName);
      }
      if (data.nationality) {
        formData.append('nationality', data.nationality);
      }

      const response = await formDataClient.post<any>('/kyc/submit', formData);
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 獲取我的 KYC 記錄
   */
  async getMyKyc(): Promise<KycRecord | null> {
    try {
      const response = await apiClient.get<any>('/kyc/me');
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      // 404 表示還沒有 KYC 記錄
      if (extractErrorMessage(error).includes('404')) {
        return null;
      }
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 獲取所有 KYC 申請
   */
  async getAllKyc(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{
    data: KycRecord[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));
      if (params?.status) queryParams.append('status', params.status);

      const queryString = queryParams.toString();
      const url = `/kyc/admin/all${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<any>(url);
      // Backend returns { success: true, data: { kycRecords, pagination } }
      const result = response.data.data || response.data;
      return {
        data: result.kycRecords || [],
        pagination: result.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 }
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 管理員 - 審核 KYC
   */
  async reviewKyc(
    id: string,
    data: {
      action: 'approve' | 'reject';
      notes?: string;
    }
  ): Promise<KycRecord> {
    try {
      const response = await apiClient.patch<any>(`/kyc/admin/${id}/review`, data);
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
    verified: number;
    failed: number;
  }> {
    try {
      const response = await apiClient.get('/kyc/admin/stats');
      return response.data.data; // Backend returns { success: true, data: {...} }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * ✅ 新增: 驗證可驗證憑證
   * 支援傳入完整憑證物件或憑證 ID
   */
  async verifyCredential(params: {
    credential?: VerifiableCredential;
    credentialId?: string;
  }): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    try {
      const response = await apiClient.post<any>('/kyc/verify-credential', params);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}

export default new KycService();
