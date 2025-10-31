import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { ErrorCode } from '../types/index.js';
import { config } from '../config/index.js';
export const errorHandler = (err, _req, res, _next) => {
    logger.error(err.message, { error: err });
    if (err instanceof AppError) {
        const response = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        };
        return res.status(err.statusCode).json(response);
    }
    if (err.name === 'ZodError') {
        const response = {
            success: false,
            error: {
                code: ErrorCode.VALIDATION_ERROR,
                message: '輸入驗證失敗',
                details: err,
            },
        };
        return res.status(400).json(response);
    }
    const response = {
        success: false,
        error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: config.nodeEnv === 'production' ? '伺服器錯誤' : err.message,
            ...(config.nodeEnv !== 'production' && { details: err.stack }),
        },
    };
    return res.status(500).json(response);
};
export const notFoundHandler = (_req, res) => {
    const response = {
        success: false,
        error: {
            code: ErrorCode.NOT_FOUND,
            message: 'API 端點不存在',
        },
    };
    return res.status(404).json(response);
};
//# sourceMappingURL=errorHandler.js.map