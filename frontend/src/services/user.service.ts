import apiClient, { buildQueryString, extractErrorMessage } from './api';

export interface User {
  id: string;
  did: string;
  role: 'TOURIST' | 'INVESTOR' | 'MERCHANT' | 'ADMIN';
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  walletAddress: string | null;
  email: string | null;
  phoneNumber: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetAllUsersParams {
  page?: number;
  limit?: number;
  role?: 'TOURIST' | 'INVESTOR' | 'MERCHANT' | 'ADMIN';
  search?: string;
}

export interface GetAllUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateUserRoleRequest {
  role: 'TOURIST' | 'INVESTOR' | 'MERCHANT' | 'ADMIN';
}

export interface UserBalance {
  walletAddress: string;
  suiBalance: number;
  taxcoinBalance: number;
}

export interface AdminMintTaxCoinRequest {
  amount: number;
  reason?: string;
}

/**
 * 用戶管理服務
 */
class UserService {
  /**
   * 獲取所有使用者列表 (管理員專用)
   */
  async getAllUsers(params?: GetAllUsersParams): Promise<GetAllUsersResponse> {
    try {
      const queryString = buildQueryString(params || {});
      const response = await apiClient.get(`/users${queryString}`);
      return response.data.data;
    } catch (error) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  }

  /**
   * 更新使用者角色 (管理員專用)
   */
  async updateUserRole(userId: string, role: UpdateUserRoleRequest['role']): Promise<User> {
    try {
      const response = await apiClient.patch(`/users/${userId}/role`, { role });
      return response.data.data.user;
    } catch (error) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  }

  /**
   * 獲取用戶錢包餘額 (管理員專用)
   */
  async getUserBalances(userId: string): Promise<UserBalance> {
    try {
      const response = await apiClient.get(`/users/${userId}/balances`);
      return response.data.data;
    } catch (error) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  }

  /**
   * 管理員為用戶鑄造 TaxCoin (管理員專用)
   */
  async adminMintTaxCoin(userId: string, request: AdminMintTaxCoinRequest): Promise<{ txHash: string; amount: number }> {
    try {
      const response = await apiClient.post(`/users/${userId}/mint-taxcoin`, request);
      return response.data.data;
    } catch (error) {
      const message = extractErrorMessage(error);
      throw new Error(message);
    }
  }
}

const userService = new UserService();
export default userService;
