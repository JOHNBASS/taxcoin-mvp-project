import { ErrorCode } from '../types/index.js';
export declare class AppError extends Error {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: unknown | undefined;
    constructor(code: ErrorCode, message: string, statusCode?: number, details?: unknown | undefined);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class BusinessError extends AppError {
    constructor(code: ErrorCode, message: string, statusCode?: number);
}
export declare class ExternalServiceError extends AppError {
    constructor(code: ErrorCode, message: string, details?: unknown);
}
//# sourceMappingURL=errors.d.ts.map