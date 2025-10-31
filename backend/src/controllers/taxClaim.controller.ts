import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.js';
import { AuthRequest, ApiResponse, UserRole, KycStatus } from '@/types/index.js';
import {
  ValidationError,
  NotFoundError,
  BusinessError,
  ForbiddenError,
} from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import { logger } from '@/utils/logger.js';
import { extractReceiptData, validateOcrResult } from '@/services/ocr.service.js';
import {
  calculateTaxAmount,
  calculateTaxCoinAmount,
  checkMinimumAmount,
  validateTaxCalculation,
} from '@/services/taxCalculator.service.js';
import { suiService } from '@/services/sui.service.js';

// ===== 請求驗證 Schema =====

const updateClaimStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectedReason: z.string().optional(),
});

// ===== 控制器函數 =====

/**
 * 創建退稅申請
 * POST /api/v1/tax-claims
 */
export const createTaxClaim = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 檢查使用者角色
  if (req.user!.role !== UserRole.TOURIST) {
    throw new ForbiddenError('僅旅客可以申請退稅');
  }

  // 檢查 KYC 狀態
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.kycStatus !== KycStatus.VERIFIED) {
    throw new BusinessError(
      ErrorCode.KYC_NOT_VERIFIED,
      '請先完成 KYC 驗證才能申請退稅'
    );
  }

  // 檢查是否有上傳收據
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new ValidationError('請上傳至少一張收據圖片');
  }

  logger.info('開始處理退稅申請', {
    userId,
    fileCount: files.length,
  });

  // 處理所有收據圖片的 OCR
  const receiptPaths = files.map((file) => file.path);
  const receiptUrls = files.map((file) => `/uploads/receipts/${file.filename}`);

  try {
    let ocrResult;
    let entryFlight: string | undefined;
    let entryFlightDate: Date | undefined;
    let exitFlight: string | undefined;
    let exitFlightDate: Date | undefined;

    // 檢查是否有手動輸入的數據
    const manualDataStr = req.body.manualData;
    if (manualDataStr) {
      // 使用手動輸入的數據
      const manualData = JSON.parse(manualDataStr);
      logger.info('使用手動輸入的收據資訊', { manualData });

      ocrResult = {
        merchantName: manualData.merchantName,
        purchaseDate: manualData.purchaseDate,
        totalAmount: parseFloat(manualData.totalAmount),
        items: [],
        confidence: 1.0, // 手動輸入，信心度為 100%
      };

      // 儲存機票資訊
      entryFlight = manualData.entryFlight;
      entryFlightDate = manualData.entryFlightDate ? new Date(manualData.entryFlightDate) : undefined;
      exitFlight = manualData.exitFlight;
      exitFlightDate = manualData.exitFlightDate ? new Date(manualData.exitFlightDate) : undefined;
    } else {
      // 執行 OCR 識別
      const ocrResults = await Promise.all(
        receiptPaths.map((path) => extractReceiptData(path))
      );

      // 驗證 OCR 結果
      const validResults = ocrResults.filter((result) =>
        validateOcrResult(result)
      );

      if (validResults.length === 0) {
        throw new BusinessError(
          ErrorCode.OCR_FAILED,
          'OCR 識別失敗,請確保收據圖片清晰可讀'
        );
      }

      // 使用第一個有效結果 (如果有多張收據,可以合併處理)
      ocrResult = validResults[0];
      if (!ocrResult) {
        throw new BusinessError(
          ErrorCode.OCR_FAILED,
          'OCR 識別失敗,請確保收據圖片清晰可讀'
        );
      }
    }

    // 檢查最低消費金額
    const meetsMinimum = await checkMinimumAmount(ocrResult.totalAmount);
    if (!meetsMinimum) {
      throw new ValidationError('消費金額未達退稅門檻');
    }

    // 計算退稅金額
    const taxAmount = await calculateTaxAmount(ocrResult.totalAmount);
    const taxCoinAmount = calculateTaxCoinAmount(taxAmount);

    // 驗證計算結果
    if (!validateTaxCalculation(ocrResult.totalAmount, taxAmount)) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '退稅金額計算錯誤'
      );
    }

    // 創建退稅申請
    const taxClaim = await prisma.taxClaim.create({
      data: {
        userId,
        receiptImages: receiptUrls,
        ocrResult: ocrResult as any,
        originalAmount: ocrResult.totalAmount,
        taxAmount,
        taxCoinAmount,
        status: 'PENDING',
        entryFlight: entryFlight,
        entryFlightDate: entryFlightDate,
        exitFlight: exitFlight,
        exitFlightDate: exitFlightDate,
      },
    });

    // 創建通知
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

    const response: ApiResponse = {
      success: true,
      data: {
        id: taxClaim.id,
        originalAmount: taxClaim.originalAmount,
        totalAmount: taxClaim.originalAmount, // Add for frontend compatibility
        taxAmount: taxClaim.taxAmount,
        taxCoinAmount: taxClaim.taxCoinAmount,
        status: taxClaim.status,
        ocrResult: taxClaim.ocrResult,
        createdAt: taxClaim.createdAt,
      },
    };

    return res.status(201).json(response);
  } catch (error) {
    logger.error('創建退稅申請失敗', { error, userId });
    throw error;
  }
};

/**
 * 獲取當前使用者的所有退稅申請
 * GET /api/v1/tax-claims
 */
export const getMyTaxClaims = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 解析查詢參數
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  // 構建查詢條件
  const where: any = { userId };
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
        nft: true,
      },
    }),
    prisma.taxClaim.count({ where }),
  ]);

  // 格式化返回数据，添加 totalAmount 字段（兼容前端）
  const formattedClaims = claims.map(claim => ({
    ...claim,
    totalAmount: claim.originalAmount, // 添加前端期望的字段名
    nftTokenId: claim.nft?.nftTokenId,
  }));

  const response: ApiResponse = {
    success: true,
    data: {
      claims: formattedClaims,
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

/**
 * 獲取單一退稅申請詳情
 * GET /api/v1/tax-claims/:id
 */
export const getTaxClaimById = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
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

  // 格式化返回数据，添加 totalAmount 字段（兼容前端）
  const formattedClaim = {
    ...claim,
    totalAmount: claim.originalAmount,
    nftTokenId: claim.nft?.nftTokenId,
  };

  const response: ApiResponse = {
    success: true,
    data: formattedClaim,
  };

  return res.json(response);
};

/**
 * 獲取所有退稅申請 (管理員)
 * GET /api/v1/admin/tax-claims
 */
export const getAllTaxClaims = async (req: AuthRequest, res: Response) => {
  // 解析查詢參數
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const where: any = {};
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

  // 格式化返回数据，添加 totalAmount 字段（兼容前端）
  const formattedClaims = claims.map(claim => ({
    ...claim,
    totalAmount: claim.originalAmount, // 添加前端期望的字段名
    nftTokenId: claim.nft?.nftTokenId,
  }));

  const response: ApiResponse = {
    success: true,
    data: {
      claims: formattedClaims,
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

/**
 * 審核退稅申請 (管理員)
 * PATCH /api/v1/admin/tax-claims/:id/review
 */
export const reviewTaxClaim = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.userId;
  const claimId = req.params.id;

  // 驗證請求
  const parseResult = updateClaimStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { status, rejectedReason } = parseResult.data;

  // 檢查申請是否存在 (包含用戶和 KYC 記錄)
  const claim = await prisma.taxClaim.findUnique({
    where: { id: claimId },
    include: {
      user: {
        include: {
          kycRecords: {
            where: { status: 'VERIFIED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!claim) {
    throw new NotFoundError('退稅申請不存在');
  }

  if (claim.status !== 'PENDING') {
    throw new ValidationError('該申請已被審核過');
  }

  // 更新申請狀態
  const updatedClaim = await prisma.taxClaim.update({
    where: { id: claimId },
    data: {
      status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      rejectedReason: status === 'REJECTED' ? rejectedReason : null,
    },
  });

  // 創建通知
  const notificationMessage =
    status === 'APPROVED'
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

  // 如果核准，自動觸發 TaxCoin 發放流程
  if (status === 'APPROVED') {
    try {
      logger.info('開始發放 TaxCoin 和 NFT', { claimId, amount: claim.taxCoinAmount });

      // ✅ 獲取用戶的 KYC 記錄 (包含 DID Document Hash 和憑證 ID)
      const kycRecord = claim.user.kycRecords?.[0];

      // 呼叫區塊鏈服務發放 Token 和 NFT
      const disburseResult = await suiService.disburseTokens({
        claimId: claim.id,
        recipientAddress: claim.user.walletAddress!,
        did: claim.user.did,
        didDocumentHash: kycRecord?.didDocumentHash || undefined, // ✅ DID Document Hash
        credentialId: kycRecord?.credentialId || undefined, // ✅ 可驗證憑證 ID
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        taxCoinAmount: claim.taxCoinAmount,
        merchantName: (claim.ocrResult as any)?.merchantName || '未知商家',
        purchaseDate: (claim.ocrResult as any)?.purchaseDate || new Date().toISOString(),
        receiptHash: claim.receiptImages[0] || '',
      });

      // 更新資料庫，記錄發放資訊
      await prisma.taxClaim.update({
        where: { id: claimId },
        data: {
          status: 'DISBURSED',
          disbursedAt: new Date(),
        },
      });

      // 創建 NFT 記錄
      await prisma.taxClaimNft.create({
        data: {
          taxClaim: {
            connect: { id: claimId }
          },
          nftTokenId: disburseResult.nftObjectId,
          metadataUri: `sui:${disburseResult.nftObjectId}`,
        },
      });

      logger.info('TaxCoin 和 NFT 發放成功', {
        claimId,
        txHash: disburseResult.txHash,
        nftObjectId: disburseResult.nftObjectId,
      });

      // 更新通知
      await prisma.notification.create({
        data: {
          userId: claim.userId,
          title: 'TaxCoin 已發放',
          message: `您已收到 ${claim.taxCoinAmount} TaxCoin，交易哈希: ${disburseResult.txHash}`,
          type: 'TAX_DISBURSED',
        },
      });
    } catch (error) {
      logger.error('TaxCoin 發放失敗', { error, claimId });
      // 發放失敗，但審核狀態已更新為 APPROVED
      // 可以稍後手動重試發放
      await prisma.notification.create({
        data: {
          userId: claim.userId,
          title: 'TaxCoin 發放處理中',
          message: `您的退稅申請已核准，TaxCoin 發放處理中，請稍後查看`,
          type: 'TAX_APPROVED',
        },
      });
    }
  }

  const response: ApiResponse = {
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

/**
 * 手動發放 Token 和 NFT (管理員)
 * POST /api/v1/admin/tax-claims/:id/disburse
 */
export const disburseTokens = async (req: AuthRequest, res: Response) => {
  const adminId = req.user!.userId;
  const claimId = req.params.id;

  logger.info('開始處理 Token 發放請求', { claimId, adminId });

  // 檢查申請是否存在 (包含用戶和 KYC 記錄)
  const claim = await prisma.taxClaim.findUnique({
    where: { id: claimId },
    include: {
      user: {
        include: {
          kycRecords: {
            where: { status: 'VERIFIED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      nft: true,
    },
  });

  logger.info('查詢到申請', { found: !!claim, claimId });

  if (!claim) {
    throw new NotFoundError('退稅申請不存在');
  }

  // 檢查狀態
  if (claim.status !== 'APPROVED') {
    throw new ValidationError('只能發放已核准的申請');
  }

  // 檢查是否已發放
  if (claim.nft) {
    throw new ValidationError('該申請已發放過 Token');
  }

  // 檢查錢包地址
  if (!claim.user.walletAddress) {
    throw new ValidationError('使用者尚未綁定錢包地址');
  }

  logger.info('管理員手動發放 Token', { claimId, adminId });

  try {
    // ✅ 獲取用戶的 KYC 記錄 (包含 DID Document Hash 和憑證 ID)
    const kycRecord = claim.user.kycRecords?.[0];

    // 呼叫區塊鏈服務發放 Token 和 NFT
    const disburseResult = await suiService.disburseTokens({
      claimId: claim.id,
      recipientAddress: claim.user.walletAddress,
      did: claim.user.did,
      didDocumentHash: kycRecord?.didDocumentHash || undefined, // ✅ DID Document Hash
      credentialId: kycRecord?.credentialId || undefined, // ✅ 可驗證憑證 ID
      originalAmount: claim.originalAmount,
      taxAmount: claim.taxAmount,
      taxCoinAmount: claim.taxCoinAmount,
      merchantName: (claim.ocrResult as any)?.merchantName || '未知商家',
      purchaseDate: (claim.ocrResult as any)?.purchaseDate || new Date().toISOString(),
      receiptHash: claim.receiptImages[0] || '',
    });

    // 更新資料庫
    await prisma.taxClaim.update({
      where: { id: claimId },
      data: {
        status: 'DISBURSED',
        disbursedAt: new Date(),
      },
    });

    // 創建 NFT 記錄
    await prisma.taxClaimNft.create({
      data: {
        taxClaim: {
          connect: { id: claimId }
        },
        nftTokenId: disburseResult.nftObjectId,
        metadataUri: `sui:${disburseResult.nftObjectId}`,
      },
    });

    // 創建通知
    await prisma.notification.create({
      data: {
        userId: claim.userId,
        title: 'TaxCoin 已發放',
        message: `您已收到 ${claim.taxCoinAmount} TaxCoin，交易哈希: ${disburseResult.txHash}`,
        type: 'TAX_DISBURSED',
      },
    });

    logger.info('Token 和 NFT 發放成功', {
      claimId,
      txHash: disburseResult.txHash,
      nftObjectId: disburseResult.nftObjectId,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash: disburseResult.txHash,
        nftObjectId: disburseResult.nftObjectId,
        taxCoinAmount: disburseResult.taxCoinAmount,
        status: 'DISBURSED',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('Token 發放失敗', { error, claimId });
    throw error;
  }
};

/**
 * 獲取退稅統計 (管理員)
 * GET /api/v1/admin/tax-claims/stats
 */
export const getTaxClaimStats = async (_req: AuthRequest, res: Response) => {
  const [totalClaims, pendingClaims, approvedClaims, rejectedClaims, aggregateData] =
    await Promise.all([
      prisma.taxClaim.count(),
      prisma.taxClaim.count({ where: { status: 'PENDING' } }),
      prisma.taxClaim.count({ where: { status: 'APPROVED' } }),
      prisma.taxClaim.count({ where: { status: 'REJECTED' } }),
      prisma.taxClaim.aggregate({
        where: { status: 'APPROVED' },
        _sum: {
          originalAmount: true,
          taxAmount: true,
        },
      }),
    ]);

  const response: ApiResponse = {
    success: true,
    data: {
      total: totalClaims,
      pending: pendingClaims,
      approved: approvedClaims,
      rejected: rejectedClaims,
      totalAmount: aggregateData._sum?.originalAmount || 0,
      totalTax: aggregateData._sum?.taxAmount || 0,
    },
  };

  return res.json(response);
};

/**
 * 緊急轉移靈魂綁定 NFT (管理員)
 * POST /api/v1/tax-claims/admin/:id/emergency-transfer
 */
export const emergencyTransferNFT = async (req: AuthRequest, res: Response) => {
  const claimId = req.params.id;
  const { newOwner, reason } = req.body;
  const adminId = req.user!.userId;

  logger.info('開始緊急轉移 NFT', { claimId, newOwner, adminId });

  try {
    // 驗證輸入
    if (!newOwner || typeof newOwner !== 'string') {
      throw new ValidationError('新持有者地址為必填項');
    }

    if (!reason || typeof reason !== 'string') {
      throw new ValidationError('轉移原因為必填項');
    }

    // 驗證地址格式 (Sui 地址應為 0x 開頭)
    if (!newOwner.startsWith('0x')) {
      throw new ValidationError('無效的 Sui 錢包地址');
    }

    // 獲取退稅申請
    const claim = await prisma.taxClaim.findUnique({
      where: { id: claimId },
      include: {
        user: true,
        nft: true,
      },
    });

    if (!claim) {
      throw new NotFoundError('退稅申請不存在');
    }

    // 檢查是否已發放 NFT
    if (claim.status !== 'DISBURSED' || !claim.nft) {
      throw new BusinessError(
        ErrorCode.INVALID_STATUS,
        '只能轉移已發放的 NFT'
      );
    }

    // 執行鏈上緊急轉移
    const transferResult = await suiService.emergencyTransferNFT({
      nftObjectId: claim.nft.nftTokenId,
      newOwner,
      reason,
    });

    logger.info('NFT 緊急轉移成功', {
      claimId,
      nftId: claim.nft.nftTokenId,
      oldOwner: claim.user.walletAddress,
      newOwner,
      txHash: transferResult.txHash,
    });

    // 記錄轉移事件（可選：創建 NFTTransferHistory 表）
    // 目前暫時只記錄在 logger 中

    // 返回結果
    const response: ApiResponse = {
      success: true,
      data: {
        txHash: transferResult.txHash,
        newOwner,
        message: 'NFT 緊急轉移成功',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('NFT 緊急轉移失敗', { error, claimId, newOwner });
    throw error;
  }
};
