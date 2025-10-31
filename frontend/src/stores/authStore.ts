import { create } from 'zustand';
import type { User } from '../types';
import authService from '../services/auth.service';
import { walletAdapter } from '../utils/wallet';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (walletAddress: string, signature: string, publicKey: string, message: string, nonce: string) => Promise<void>;
  register: (walletAddress: string, role: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  /**
   * 初始化認證狀態 (從 localStorage 讀取)
   */
  initializeAuth: () => {
    const token = authService.getToken();
    const user = authService.getCurrentUser();

    if (token && user) {
      set({
        token,
        user,
        isAuthenticated: true,
      });
    }
  },

  /**
   * 錢包登入
   */
  login: async (walletAddress: string, signature: string, publicKey: string, message: string, nonce: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.walletLogin({
        walletAddress,
        signature,
        publicKey,
        message,
        nonce,
      });

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登入失敗';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * 註冊新使用者
   */
  register: async (walletAddress: string, role: string, email?: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.register({
        walletAddress,
        role: role as any,
        email,
      });

      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '註冊失敗';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * 登出
   */
  logout: () => {
    authService.logout();
    walletAdapter.disconnect();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * 刷新使用者資訊
   */
  refreshUser: async () => {
    try {
      const user = await authService.refreshUserInfo();
      set({ user });
    } catch (error) {
      console.error('Failed to refresh user info:', error);
      // 如果刷新失敗,可能是 token 過期,執行登出
      get().logout();
    }
  },

  /**
   * 清除錯誤訊息
   */
  clearError: () => {
    set({ error: null });
  },
}));
