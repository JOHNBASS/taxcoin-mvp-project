import { ErrorCode } from '@/types/index.js';

// 自定義錯誤基類
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 認證錯誤
export class UnauthorizedError extends AppError {
  constructor(message = '未授權訪問') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '無權限執行此操作') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

// 驗證錯誤
export class ValidationError extends AppError {
  constructor(message = '輸入驗證失敗', details?: unknown) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

// 資源錯誤
export class NotFoundError extends AppError {
  constructor(message = '資源不存在') {
    super(ErrorCode.NOT_FOUND, message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = '資源已存在') {
    super(ErrorCode.ALREADY_EXISTS, message, 409);
  }
}

// 業務邏輯錯誤
export class BusinessError extends AppError {
  constructor(code: ErrorCode, message: string, statusCode = 400) {
    super(code, message, statusCode);
  }
}

// 外部服務錯誤
export class ExternalServiceError extends AppError {
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(code, message, 503, details);
  }
}
