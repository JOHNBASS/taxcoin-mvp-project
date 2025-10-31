import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { UserRole, KycStatus } from '../types/index.js';
import { ValidationError, NotFoundError, BusinessError, ForbiddenError, } from '../utils/errors.js';
import { ErrorCode } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { extractReceiptData, validateOcrResult } from '../services/ocr.service.js';
import { calculateTaxAmount, calculateTaxCoinAmount, checkMinimumAmount, validateTaxCalculation, } from '../services/taxCalculator.service.js';
const updateClaimStatusSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectedReason: z.string().optional(),
});
export const createTaxClaim = async (req, res) => {
    const userId = req.user.userId;
    if (req.user.role !== UserRole.TOURIST) {
        throw new ForbiddenError('僅旅客可以申請退稅');
    }
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user || user.kycStatus !== KycStatus.VERIFIED) {
        throw new BusinessError(ErrorCode.KYC_NOT_VERIFIED, '請先完成 KYC 驗證才能申請退稅');
    }
    const files = req.files;
    if (!files || files.length === 0) {
        throw new ValidationError('請上傳至少一張收據圖片');
    }
    logger.info('開始處理退稅申請', {
        userId,
        fileCount: files.length,
    });
    const receiptPaths = files.map((file) => file.path);
    const receiptUrls = files.map((file) => `/uploads/receipts/${file.filename}`);
    try {
        const ocrResults = await Promise.all(receiptPaths.map((path) => extractReceiptData(path)));
        const validResults = ocrResults.filter((result) => validateOcrResult(result));
        if (validResults.length === 0) {
            throw new BusinessError(ErrorCode.OCR_FAILED, 'OCR 識別失敗,請確保收據圖片清晰可讀');
        }
        const ocrResult = validResults[0];
        if (!ocrResult) {
            throw new BusinessError(ErrorCode.OCR_FAILED, 'OCR 識別失敗,請確保收據圖片清晰可讀');
        }
        const meetsMinimum = await checkMinimumAmount(ocrResult.totalAmount);
        if (!meetsMinimum) {
            throw new ValidationError('消費金額未達退稅門檻');
        }
        const taxAmount = await calculateTaxAmount(ocrResult.totalAmount);
        const taxCoinAmount = calculateTaxCoinAmount(taxAmount);
        if (!validateTaxCalculation(ocrResult.totalAmount, taxAmount)) {
            throw new BusinessError(ErrorCode.INTERNAL_ERROR, '退稅金額計算錯誤');
        }
        const taxClaim = await prisma.taxClaim.create({
            data: {
                userId,
                receiptImages: receiptUrls,
                ocrResult: ocrResult,
                originalAmount: ocrResult.totalAmount,
                taxAmount,
                taxCoinAmount,
                status: 'PENDING',
            },
        });
        await prisma.notification.create({
            data: {
                userId,
                title: '退稅申請已提交',
                message: `您的退稅申請已提交,預計退稅金額 ${taxAmount} TWD (${taxCoinAmount} TaxCoin)`,
                type: 'TAX_SUBMITTED',
            },
        });
        logger.info('退稅申請創建成功', {
            taxClaimId: taxClaim.id,
            userId,
            taxAmount,
        });
        const response = {
            success: true,
            data: {
                id: taxClaim.id,
                originalAmount: taxClaim.originalAmount,
                taxAmount: taxClaim.taxAmount,
                taxCoinAmount: taxClaim.taxCoinAmount,
                status: taxClaim.status,
                ocrResult: taxClaim.ocrResult,
                createdAt: taxClaim.createdAt,
            },
        };
        return res.status(201).json(response);
    }
    catch (error) {
        logger.error('創建退稅申請失敗', { error, userId });
        throw error;
    }
};
export const getMyTaxClaims = async (req, res) => {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [claims, total] = await Promise.all([
        prisma.taxClaim.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                nft: true,
            },
        }),
        prisma.taxClaim.count({ where: { userId } }),
    ]);
    const response = {
        success: true,
        data: {
            claims,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
    return res.json(response);
};
export const getTaxClaimById = async (req, res) => {
    const userId = req.user.userId;
    const claimId = req.params.id;
    const claim = await prisma.taxClaim.findFirst({
        where: {
            id: claimId,
            userId,
        },
        include: {
            nft: true,
        },
    });
    if (!claim) {
        throw new NotFoundError('退稅申請不存在');
    }
    const response = {
        success: true,
        data: claim,
    };
    return res.json(response);
};
export const getAllTaxClaims = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) {
        where.status = status;
    }
    const [claims, total] = await Promise.all([
        prisma.taxClaim.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        walletAddress: true,
                    },
                },
                nft: true,
            },
        }),
        prisma.taxClaim.count({ where }),
    ]);
    const response = {
        success: true,
        data: {
            claims,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    };
    return res.json(response);
};
export const reviewTaxClaim = async (req, res) => {
    const adminId = req.user.userId;
    const claimId = req.params.id;
    const parseResult = updateClaimStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { status, rejectedReason } = parseResult.data;
    const claim = await prisma.taxClaim.findUnique({
        where: { id: claimId },
        include: { user: true },
    });
    if (!claim) {
        throw new NotFoundError('退稅申請不存在');
    }
    if (claim.status !== 'PENDING') {
        throw new ValidationError('該申請已被審核過');
    }
    const updatedClaim = await prisma.taxClaim.update({
        where: { id: claimId },
        data: {
            status,
            reviewedBy: adminId,
            reviewedAt: new Date(),
            rejectedReason: status === 'REJECTED' ? rejectedReason : null,
        },
    });
    const notificationMessage = status === 'APPROVED'
        ? `您的退稅申請已核准,將發放 ${claim.taxCoinAmount} TaxCoin`
        : `您的退稅申請已被拒絕。原因: ${rejectedReason || '不符合退稅條件'}`;
    await prisma.notification.create({
        data: {
            userId: claim.userId,
            title: status === 'APPROVED' ? '退稅申請已核准' : '退稅申請已拒絕',
            message: notificationMessage,
            type: status === 'APPROVED' ? 'TAX_APPROVED' : 'TAX_REJECTED',
        },
    });
    logger.info('退稅申請審核完成', {
        claimId,
        status,
        reviewedBy: adminId,
    });
    if (status === 'APPROVED') {
        logger.info('待實作: 發放 TaxCoin', { claimId, amount: claim.taxCoinAmount });
    }
    const response = {
        success: true,
        data: {
            id: updatedClaim.id,
            status: updatedClaim.status,
            reviewedAt: updatedClaim.reviewedAt,
            rejectedReason: updatedClaim.rejectedReason,
        },
    };
    return res.json(response);
};
export const getTaxClaimStats = async (_req, res) => {
    const [totalClaims, pendingClaims, approvedClaims, rejectedClaims, totalTaxAmount] = await Promise.all([
        prisma.taxClaim.count(),
        prisma.taxClaim.count({ where: { status: 'PENDING' } }),
        prisma.taxClaim.count({ where: { status: 'APPROVED' } }),
        prisma.taxClaim.count({ where: { status: 'REJECTED' } }),
        prisma.taxClaim.aggregate({
            where: { status: 'APPROVED' },
            _sum: { taxAmount: true },
        }),
    ]);
    const response = {
        success: true,
        data: {
            totalClaims,
            pendingClaims,
            approvedClaims,
            rejectedClaims,
            totalTaxAmount: totalTaxAmount._sum.taxAmount || 0,
            approvalRate: totalClaims > 0
                ? Math.round((approvedClaims / totalClaims) * 100)
                : 0,
        },
    };
    return res.json(response);
};
//# sourceMappingURL=taxClaim.controller.js.map