import { ErrorCode } from '../types/index.js';
export class AppError extends Error {
    code;
    message;
    statusCode;
    details;
    constructor(code, message, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
        this.details = details;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
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
export class ValidationError extends AppError {
    constructor(message = '輸入驗證失敗', details) {
        super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    }
}
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
export class BusinessError extends AppError {
    constructor(code, message, statusCode = 400) {
        super(code, message, statusCode);
    }
}
export class ExternalServiceError extends AppError {
    constructor(code, message, details) {
        super(code, message, 503, details);
    }
}
//# sourceMappingURL=errors.js.map