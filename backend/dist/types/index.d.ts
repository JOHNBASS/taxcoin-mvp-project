import { Request } from 'express';
import type { UserRole } from '@prisma/client';
export { UserRole, KycStatus, ClaimStatus, PoolStatus, InvestmentStatus, RiskLevel } from '@prisma/client';
export interface JwtPayload {
    id: string;
    userId: string;
    did: string;
    role: UserRole;
}
export interface AuthRequest extends Request {
    user?: JwtPayload;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}
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
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    KYC_NOT_VERIFIED = "KYC_NOT_VERIFIED",
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
    POOL_FULL = "POOL_FULL",
    POOL_EXPIRED = "POOL_EXPIRED",
    OCR_FAILED = "OCR_FAILED",
    BLOCKCHAIN_ERROR = "BLOCKCHAIN_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
//# sourceMappingURL=index.d.ts.map