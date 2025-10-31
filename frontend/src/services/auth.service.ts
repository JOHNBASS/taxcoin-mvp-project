import apiClient, { extractErrorMessage } from './api';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../types';

/**
 * 認證服務
 */
class AuthService {
  /**
   * 獲取登入 nonce
   */
  async getNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    try {
      const response = await apiClient.post('/auth/nonce', { walletAddress });
      return response.data.data; // 後端回應格式: { success: true, data: { nonce, message } }
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 錢包簽名登入
   */
  async walletLogin(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/wallet-login', data);
      const authData = response.data.data; // 後端回應格式: { success: true, data: { token, user } }

      // 儲存 token 和用戶資訊
      if (authData.token) {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }

      return authData;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 使用者註冊
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', data);
      const authData = response.data.data; // 後端回應格式: { success: true, data: { token, user } }

      // 儲存 token 和用戶資訊
      if (authData.token) {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(authData.user));
      }

      return authData;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 登出
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * 檢查是否已登入
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * 獲取當前使用者
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * 獲取當前 Token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * 刷新使用者資訊
   */
  async refreshUserInfo(): Promise<User> {
    try {
      const response = await apiClient.get('/users/me');
      const userData = response.data.data; // 後端回應格式: { success: true, data: { id, did, role, kycStatus, ... } }
      localStorage.setItem('user', JSON.stringify(userData));
      return userData;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}

export default new AuthService();
