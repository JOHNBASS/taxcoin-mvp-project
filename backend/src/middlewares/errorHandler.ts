import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors.js';
import { logger } from '@/utils/logger.js';
import { ApiResponse, ErrorCode } from '@/types/index.js';
import { config } from '@/config/index.js';

// 錯誤處理中間件
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 記錄錯誤
  logger.error(err.message, { error: err });

  // AppError 錯誤
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    return res.status(err.statusCode).json(response);
  }

  // Zod 驗證錯誤
  if (err.name === 'ZodError') {
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: '輸入驗證失敗',
        details: err,
      },
    };

    return res.status(400).json(response);
  }

  // 預設錯誤回應
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: config.nodeEnv === 'production' ? '伺服器錯誤' : err.message,
      ...(config.nodeEnv !== 'production' && { details: err.stack }),
    },
  };

  return res.status(500).json(response);
};

// 404 處理
export const notFoundHandler = (_req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: 'API 端點不存在',
    },
  };

  return res.status(404).json(response);
};
