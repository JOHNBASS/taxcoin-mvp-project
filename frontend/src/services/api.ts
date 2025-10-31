import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API 基礎配置
// 使用相對路徑,讓 nginx 代理轉發到 backend 容器
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

// 創建 Axios 實例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 秒超時 (OCR 可能需要較長時間)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 攔截器 - 自動注入 JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response 攔截器 - 統一錯誤處理
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 401 未授權 - 清除 token 並跳轉到登入頁
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // 403 禁止訪問
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data);
    }

    // 500 伺服器錯誤
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data);
    }

    return Promise.reject(error);
  }
);

// 創建 FormData API 客戶端 (用於檔案上傳)
const createFormDataClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 檔案上傳給予更長時間
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // 注入 Token
  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return client;
};

export const formDataClient = createFormDataClient();

export default apiClient;

// ============================================
// 輔助函數
// ============================================

/**
 * 從錯誤對象提取錯誤訊息
 */
export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string | { code: string; message: string; details?: any }
    }>;

    // API 返回的錯誤訊息
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    // Backend 返回的錯誤格式: { error: { code, message, details } }
    if (axiosError.response?.data?.error) {
      const errorData = axiosError.response.data.error;
      // 如果 error 是物件,提取 message
      if (typeof errorData === 'object' && 'message' in errorData) {
        return errorData.message;
      }
      // 如果 error 是字串,直接返回
      if (typeof errorData === 'string') {
        return errorData;
      }
    }

    // HTTP 狀態碼錯誤
    if (axiosError.response?.status) {
      const status = axiosError.response.status;
      switch (status) {
        case 400:
          return '請求格式錯誤';
        case 401:
          return '未授權,請重新登入';
        case 403:
          return '無權限訪問此資源';
        case 404:
          return '請求的資源不存在';
        case 500:
          return '伺服器錯誤,請稍後再試';
        default:
          return `請求失敗 (${status})`;
      }
    }

    // 網路錯誤
    if (axiosError.message === 'Network Error') {
      return '網路連線失敗,請檢查網路';
    }

    // 超時錯誤
    if (axiosError.code === 'ECONNABORTED') {
      return '請求超時,請稍後再試';
    }

    return axiosError.message || '未知錯誤';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '發生未知錯誤';
};

/**
 * 建立查詢字串
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};
