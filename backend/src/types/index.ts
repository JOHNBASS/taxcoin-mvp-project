import { Request } from 'express';
import type { UserRole } from '@prisma/client';

// Re-export Prisma enums for convenience
export { UserRole, KycStatus, ClaimStatus, PoolStatus, InvestmentStatus, RiskLevel } from '@prisma/client';

// JWT Payload
export interface JwtPayload {
  id: string; // 用戶 ID (別名 userId)
  userId: string;
  did: string;
  role: UserRole;
}

// 擴展 Express Request 型別
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// API 回應格式
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// OCR 結果
export interface OcrResult {
  merchantName: string;
  purchaseDate: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  confidence: number;
}

// 錯誤代碼
export enum ErrorCode {
  // 認證相關
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // 驗證相關
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // 資源相關
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // 業務邏輯
  KYC_NOT_VERIFIED = 'KYC_NOT_VERIFIED',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  POOL_FULL = 'POOL_FULL',
  POOL_EXPIRED = 'POOL_EXPIRED',
  INVALID_STATUS = 'INVALID_STATUS',

  // 外部服務
  OCR_FAILED = 'OCR_FAILED',
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',

  // 伺服器錯誤
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
