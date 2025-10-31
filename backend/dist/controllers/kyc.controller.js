import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { extractPassportData, validatePassportOcr, isPassportExpired } from '../services/passportOcr.service.js';
import { verifyFaceImage, verifyFaceMatch, getFaceVerificationAdvice } from '../services/faceVerification.service.js';
export const submitKyc = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const files = req.files;
    if (!files?.passport || !files?.face) {
        throw new ValidationError('請上傳護照照片和自拍照');
    }
    const passportImage = files.passport?.[0];
    const faceImage = files.face?.[0];
    if (!passportImage || !faceImage) {
        throw new ValidationError('請上傳護照照片和自拍照');
    }
    const existingKyc = await prisma.kycRecord.findFirst({
        where: {
            userId,
            status: {
                in: ['PENDING', 'VERIFIED'],
            },
        },
    });
    if (existingKyc) {
        throw new ValidationError('您已有待審核或已通過的 KYC 記錄');
    }
    const passportData = await extractPassportData(passportImage.path);
    if (!validatePassportOcr(passportData)) {
        throw new ValidationError('護照資訊識別失敗,請重新上傳清晰的護照照片');
    }
    if (isPassportExpired(passportData.expiryDate)) {
        throw new ValidationError('護照已過期,請使用有效護照');
    }
    const faceVerification = await verifyFaceImage(faceImage.path);
    if (!faceVerification.isValid) {
        const advice = getFaceVerificationAdvice(faceVerification);
        throw new ValidationError(`自拍照驗證失敗: ${faceVerification.message}. 建議: ${advice.join('; ')}`);
    }
    const faceMatch = await verifyFaceMatch(passportImage.path, faceImage.path);
    if (!faceMatch.isValid) {
        const advice = getFaceVerificationAdvice(faceMatch);
        throw new ValidationError(`臉部比對失敗: ${faceMatch.message}. 建議: ${advice.join('; ')}`);
    }
    const kycRecord = await prisma.kycRecord.create({
        data: {
            userId,
            passportNumber: passportData.passportNumber,
            fullName: passportData.fullName,
            nationality: passportData.nationality,
            dateOfBirth: new Date(passportData.dateOfBirth),
            passportImageUrl: passportImage.path,
            faceImageUrl: faceImage.path,
            status: 'PENDING',
        },
    });
    await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'PENDING' },
    });
    await prisma.notification.create({
        data: {
            userId,
            title: 'KYC 申請已提交',
            message: `您的 KYC 驗證申請已提交,護照號碼: ${passportData.passportNumber}。我們將在 1-3 個工作天內完成審核。`,
            type: 'KYC_SUBMITTED',
        },
    });
    return res.status(201).json({
        success: true,
        message: 'KYC 申請已提交,等待審核',
        data: {
            kycId: kycRecord.id,
            status: kycRecord.status,
            passportNumber: kycRecord.passportNumber,
            fullName: kycRecord.fullName,
            nationality: kycRecord.nationality,
            submittedAt: kycRecord.createdAt,
        },
    });
});
export const getMyKyc = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const kycRecord = await prisma.kycRecord.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
    if (!kycRecord) {
        return res.json({
            success: true,
            data: null,
            message: '尚未提交 KYC 驗證',
        });
    }
    return res.json({
        success: true,
        data: {
            id: kycRecord.id,
            status: kycRecord.status,
            passportNumber: kycRecord.passportNumber,
            fullName: kycRecord.fullName,
            nationality: kycRecord.nationality,
            dateOfBirth: kycRecord.dateOfBirth,
            passportImageUrl: kycRecord.passportImageUrl,
            faceImageUrl: kycRecord.faceImageUrl,
            rejectedReason: kycRecord.rejectedReason,
            submittedAt: kycRecord.createdAt,
            reviewedAt: kycRecord.reviewedAt,
        },
    });
});
export const getAllKyc = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;
    const whereClause = {};
    if (status) {
        whereClause.status = status;
    }
    const [kycRecords, total] = await Promise.all([
        prisma.kycRecord.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        walletAddress: true,
                        role: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip,
            take: limit,
        }),
        prisma.kycRecord.count({ where: whereClause }),
    ]);
    return res.json({
        success: true,
        data: {
            kycRecords,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
});
export const getKycById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const kycRecord = await prisma.kycRecord.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    walletAddress: true,
                    role: true,
                    kycStatus: true,
                },
            },
        },
    });
    if (!kycRecord) {
        throw new NotFoundError('KYC 記錄不存在');
    }
    return res.json({
        success: true,
        data: kycRecord,
    });
});
export const reviewKyc = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new ValidationError('缺少 KYC 記錄 ID');
    }
    const { status, rejectedReason } = req.body;
    if (!['VERIFIED', 'REJECTED'].includes(status)) {
        throw new ValidationError('狀態必須是 VERIFIED 或 REJECTED');
    }
    if (status === 'REJECTED' && !rejectedReason) {
        throw new ValidationError('拒絕時必須提供原因');
    }
    const kycRecord = await prisma.kycRecord.findUnique({
        where: { id },
        include: {
            user: true,
        },
    });
    if (!kycRecord) {
        throw new NotFoundError('KYC 記錄不存在');
    }
    if (kycRecord.status !== 'PENDING') {
        throw new ForbiddenError('只能審核待審核狀態的 KYC 申請');
    }
    const updatedKyc = await prisma.kycRecord.update({
        where: { id },
        data: {
            status,
            rejectedReason: status === 'REJECTED' ? rejectedReason : null,
            reviewedAt: new Date(),
        },
    });
    await prisma.user.update({
        where: { id: kycRecord.userId },
        data: { kycStatus: status },
    });
    if (status === 'VERIFIED' && kycRecord.user.role === 'TOURIST') {
        await prisma.user.update({
            where: { id: kycRecord.userId },
            data: { role: 'INVESTOR' },
        });
    }
    await prisma.notification.create({
        data: {
            userId: kycRecord.userId,
            title: status === 'VERIFIED' ? 'KYC 驗證通過' : 'KYC 驗證未通過',
            message: status === 'VERIFIED'
                ? '恭喜!您的 KYC 驗證已通過,現在可以使用完整的投資功能。'
                : `您的 KYC 驗證未通過。原因: ${rejectedReason}`,
            type: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        },
    });
    if (req.user?.id) {
        await prisma.auditLog.create({
            data: {
                action: 'KYC_REVIEW',
                entityType: 'KycRecord',
                entityId: id,
                userId: req.user.id,
                details: {
                    kycUserId: kycRecord.userId,
                    status,
                    rejectedReason,
                },
            },
        });
    }
    return res.json({
        success: true,
        message: `KYC 申請已${status === 'VERIFIED' ? '通過' : '拒絕'}`,
        data: {
            id: updatedKyc.id,
            status: updatedKyc.status,
            reviewedAt: updatedKyc.reviewedAt,
            rejectedReason: updatedKyc.rejectedReason,
        },
    });
});
export const getKycStats = asyncHandler(async (_req, res) => {
    const [total, pending, verified, rejected] = await Promise.all([
        prisma.kycRecord.count(),
        prisma.kycRecord.count({ where: { status: 'PENDING' } }),
        prisma.kycRecord.count({ where: { status: 'VERIFIED' } }),
        prisma.kycRecord.count({ where: { status: 'REJECTED' } }),
    ]);
    const verificationRate = total > 0 ? ((verified / total) * 100).toFixed(1) : 0;
    return res.json({
        success: true,
        data: {
            total,
            pending,
            verified,
            rejected,
            verificationRate: parseFloat(verificationRate),
        },
    });
});
//# sourceMappingURL=kyc.controller.js.map