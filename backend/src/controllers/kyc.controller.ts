/**
 * KYC 驗證控制器
 */

import { Response } from 'express';
import { AuthRequest } from '@/types/index.js';
import { prisma } from '@/utils/prisma.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import { NotFoundError, ValidationError, ForbiddenError } from '@/utils/errors.js';
import { extractPassportData, isPassportExpired } from '@/services/passportOcr.service.js';
import { verifyFaceImage, verifyFaceMatch, getFaceVerificationAdvice } from '@/services/faceVerification.service.js';
import { selfService } from '@/services/self.service.js';
import { selfProtocolService } from '@/services/selfProtocol.service.js';
import { celoVerifierService } from '@/services/celoVerifier.service.js';
import { logger } from '@/utils/logger.js';

/**
 * 將檔案路徑轉換為可訪問的 URL
 * 使用完整的 URL 包含 protocol 和 host，以便前端可以正確加載圖片
 */
const filePathToUrl = (filePath: string | null): string | null => {
  if (!filePath) return null;

  // 移除容器內的絕對路徑前綴 /app/uploads 或 ./uploads
  let cleanPath = filePath
    .replace(/^\/app\/uploads\//, '')  // 移除 /app/uploads/
    .replace(/^\.?\/?uploads\//, '')   // 移除 ./uploads/ 或 uploads/
    .replace(/^\.?\/?/, '');           // 移除開頭的 ./ 或 /

  const relativePath = `/uploads/${cleanPath}`;

  // 根據環境變數決定使用哪個 URL（生產環境優先）
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://taxcoin-mvp.transferhelper.com.tw'
    : process.env.PUBLIC_URL || 'http://localhost:5003';

  const fullUrl = `${baseUrl}${relativePath}`;

  console.log('File path conversion:', {
    original: filePath,
    cleaned: cleanPath,
    relative: relativePath,
    baseUrl,
    nodeEnv: process.env.NODE_ENV,
    full: fullUrl
  });

  return fullUrl;
};

/**
 * 提交 KYC 驗證申請
 *
 * POST /kyc/submit
 * 需要上傳: passport (護照照片), face (自拍照)
 */
export const submitKyc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  // 檢查檔案上傳
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (!files?.passport || !files?.face) {
    throw new ValidationError('請上傳護照照片和自拍照');
  }

  const passportImage = files.passport?.[0];
  const faceImage = files.face?.[0];

  if (!passportImage || !faceImage) {
    throw new ValidationError('請上傳護照照片和自拍照');
  }

  // 檢查是否已有待審核或已通過的 KYC
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

  // 護照 OCR 識別
  const passportData = await extractPassportData(passportImage.path);

  // 從請求中獲取手動輸入的資料（如果有）
  const manualPassportNumber = req.body.passportNumber;
  const manualFullName = req.body.fullName;
  const manualNationality = req.body.nationality;

  // 使用手動輸入或 OCR 結果
  const finalPassportNumber = manualPassportNumber || passportData.passportNumber;
  const finalFullName = manualFullName || passportData.fullName;
  const finalNationality = manualNationality || passportData.nationality;

  // 驗證必要欄位
  if (!finalPassportNumber || !finalFullName) {
    throw new ValidationError('請提供護照號碼和姓名');
  }

  // 檢查護照是否過期（如果有到期日）
  if (passportData.expiryDate && isPassportExpired(passportData.expiryDate)) {
    throw new ValidationError('護照已過期,請使用有效護照');
  }

  // 臉部驗證 (自拍照)
  const faceVerification = await verifyFaceImage(faceImage.path);

  if (!faceVerification.isValid) {
    const advice = getFaceVerificationAdvice(faceVerification);
    throw new ValidationError(`自拍照驗證失敗: ${faceVerification.message}. 建議: ${advice.join('; ')}`);
  }

  // 護照照片 vs 自拍照比對
  // 注意: 護照照片需要從護照圖片中裁切出來,這裡簡化處理
  const faceMatch = await verifyFaceMatch(passportImage.path, faceImage.path);

  if (!faceMatch.isValid) {
    const advice = getFaceVerificationAdvice(faceMatch);
    throw new ValidationError(`臉部比對失敗: ${faceMatch.message}. 建議: ${advice.join('; ')}`);
  }

  // ✅ 獲取用戶的 W3C DID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, did: true, didDocument: true, walletAddress: true }
  });

  if (!user) {
    throw new NotFoundError('使用者不存在');
  }

  let userDID = user.did;
  let didDocument = user.didDocument;

  // 如果用戶還沒有 W3C DID (舊用戶),為其創建
  if (!userDID || !userDID.startsWith('did:key:')) {
    logger.info('🆔 為舊用戶創建 W3C DID', { userId, walletAddress: user.walletAddress });

    const didResult = await selfService.createDID(user.walletAddress!);
    userDID = didResult.did;
    didDocument = didResult.didDocument as any; // 類型轉換

    // 更新用戶 DID
    await prisma.user.update({
      where: { id: userId },
      data: {
        did: userDID,
        didDocument: didDocument as any,
        didSeed: didResult.seed
      }
    });

    logger.info('✅ W3C DID 創建成功', { userId, did: userDID });
  }

  // ✅ 簽發 KYC 可驗證憑證
  logger.info('📜 簽發 KYC 可驗證憑證', { userId, userDID });

  const credential = await selfService.issueKYCCredential({
    userDID,
    fullName: finalFullName,
    passportNumber: finalPassportNumber,
    nationality: finalNationality,
    dateOfBirth: passportData.dateOfBirth ? new Date(passportData.dateOfBirth) : new Date(),
    verificationLevel: 'BASIC'
  });

  logger.info('✅ KYC 可驗證憑證簽發成功', {
    userId,
    credentialId: credential.id,
    issuer: credential.issuer
  });

  // ✅ 計算 DID Document Hash (用於鏈上存儲)
  const didDocumentHash = await selfService.hashDIDDocument(didDocument as any);

  // 創建 KYC 記錄 (包含可驗證憑證)
  const kycRecord = await prisma.kycRecord.create({
    data: {
      userId,
      passportNumber: finalPassportNumber,
      fullName: finalFullName,
      nationality: finalNationality,
      dateOfBirth: passportData.dateOfBirth ? new Date(passportData.dateOfBirth) : new Date(),
      passportImageUrl: passportImage.path,
      faceImageUrl: faceImage.path,
      status: 'PENDING',
      // ✅ Self SDK 欄位
      verifiableCredential: credential as any,
      credentialId: credential.id,
      issuerDID: credential.issuer,
      didDocumentHash
    },
  });

  // 更新使用者 KYC 狀態為 PENDING
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: 'PENDING' },
  });

  // 創建通知
  await prisma.notification.create({
    data: {
      userId,
      title: 'KYC 申請已提交',
      message: `您的 KYC 驗證申請已提交,護照號碼: ${finalPassportNumber}。我們將在 1-3 個工作天內完成審核。`,
      type: 'KYC_SUBMITTED',
    },
  });

  return res.status(201).json({
    success: true,
    message: 'KYC 申請已提交,等待審核',
    data: {
      id: kycRecord.id,
      status: kycRecord.status,
      passportNumber: kycRecord.passportNumber,
      fullName: kycRecord.fullName,
      nationality: kycRecord.nationality,
      passportCountry: kycRecord.nationality,
      dateOfBirth: kycRecord.dateOfBirth,
      createdAt: kycRecord.createdAt,
      verifiedAt: kycRecord.verifiedAt,
      // ✅ 新增: Self SDK 相關資訊
      did: userDID,
      credentialId: credential.id,
      didDocumentHash
    },
  });
});

/**
 * 獲取我的 KYC 記錄
 *
 * GET /kyc/me
 */
export const getMyKyc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

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
      passportCountry: kycRecord.nationality, // 添加 passportCountry 欄位
      dateOfBirth: kycRecord.dateOfBirth,
      passportImageUrl: filePathToUrl(kycRecord.passportImageUrl),
      faceImageUrl: filePathToUrl(kycRecord.faceImageUrl),
      rejectedReason: kycRecord.rejectedReason,
      createdAt: kycRecord.createdAt,
      verifiedAt: kycRecord.verifiedAt,
      // ✅ 新增：Self SDK 相關資訊
      verifiableCredential: kycRecord.verifiableCredential,
      credentialId: kycRecord.credentialId,
      issuerDID: kycRecord.issuerDID,
      didDocumentHash: kycRecord.didDocumentHash,
      // 🔗 Celo 鏈上驗證信息
      celo: kycRecord.celoTxHash ? {
        txHash: kycRecord.celoTxHash,
        blockNumber: kycRecord.celoBlockNumber,
        proofHash: kycRecord.celoProofHash,
        verifiedAt: kycRecord.celoVerifiedAt,
        explorerUrl: `https://alfajores.celoscan.io/tx/${kycRecord.celoTxHash}`
      } : undefined
    },
  });
});

/**
 * 獲取所有 KYC 申請 (管理員)
 *
 * GET /admin/kyc
 */
export const getAllKyc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const whereClause: any = {};

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

  // 轉換檔案路徑為 URL
  const kycRecordsWithUrls = kycRecords.map((record) => ({
    ...record,
    passportImageUrl: filePathToUrl(record.passportImageUrl),
    faceImageUrl: filePathToUrl(record.faceImageUrl),
  }));

  return res.json({
    success: true,
    data: {
      kycRecords: kycRecordsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

/**
 * 獲取單一 KYC 記錄詳情 (管理員)
 *
 * GET /admin/kyc/:id
 */
export const getKycById = asyncHandler(async (req: AuthRequest, res: Response) => {
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

  // 轉換檔案路徑為 URL
  const kycRecordWithUrls = {
    ...kycRecord,
    passportImageUrl: filePathToUrl(kycRecord.passportImageUrl),
    faceImageUrl: filePathToUrl(kycRecord.faceImageUrl),
  };

  return res.json({
    success: true,
    data: kycRecordWithUrls,
  });
});

/**
 * 審核 KYC 申請 (管理員)
 *
 * PATCH /admin/kyc/:id/review
 */
export const reviewKyc = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new ValidationError('缺少 KYC 記錄 ID');
  }

  const { action, notes } = req.body;

  // 驗證 action
  if (!['approve', 'reject'].includes(action)) {
    throw new ValidationError('action 必須是 approve 或 reject');
  }

  // 轉換 action 為 status
  const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
  const rejectedReason = notes;

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

  // ✅ 如果審核通過，簽發 Verifiable Credential
  let verifiableCredential = null;
  let credentialId = null;
  let issuerDID = null;

  if (status === 'VERIFIED') {
    try {
      logger.info('🎫 開始簽發 KYC Verifiable Credential', {
        kycId: id,
        userDID: kycRecord.user.did,
      });

      // 簽發憑證
      const credential = await selfService.issueKYCCredential({
        userDID: kycRecord.user.did,
        fullName: kycRecord.fullName,
        passportNumber: kycRecord.passportNumber,
        nationality: kycRecord.nationality,
        dateOfBirth: kycRecord.dateOfBirth,
        verificationLevel: 'BASIC',
      });

      verifiableCredential = credential;
      credentialId = credential.id;
      issuerDID = credential.issuer;

      logger.info('✅ Verifiable Credential 簽發成功', {
        credentialId,
        issuerDID,
      });
    } catch (error) {
      logger.error('❌ 簽發 Verifiable Credential 失敗', {
        error: error instanceof Error ? error.message : String(error),
      });
      // 不阻斷審核流程，但記錄錯誤
    }
  }

  // 更新 KYC 記錄
  const updatedKyc = await prisma.kycRecord.update({
    where: { id },
    data: {
      status,
      rejectedReason: status === 'REJECTED' ? rejectedReason : null,
      reviewedAt: new Date(),
      verifiableCredential: verifiableCredential as any,
      credentialId,
      issuerDID,
    },
  });

  // 更新使用者 KYC 狀態
  await prisma.user.update({
    where: { id: kycRecord.userId },
    data: { kycStatus: status },
  });

  // 注意：不自動變更用戶角色
  // TOURIST 驗證 KYC 後仍然是 TOURIST (用於退稅)
  // INVESTOR 驗證 KYC 後仍然是 INVESTOR (用於投資)

  // 創建通知
  await prisma.notification.create({
    data: {
      userId: kycRecord.userId,
      title: status === 'VERIFIED' ? 'KYC 驗證通過' : 'KYC 驗證未通過',
      message:
        status === 'VERIFIED'
          ? '恭喜！您的 KYC 驗證已通過，現在可以使用完整的平台功能。'
          : `您的 KYC 驗證未通過。原因: ${rejectedReason}`,
      type: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
    },
  });

  // 記錄審計日誌
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

/**
 * 驗證可驗證憑證
 *
 * POST /kyc/verify-credential
 */
export const verifyCredentialController = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { credential, credentialId } = req.body;

  if (!credential && !credentialId) {
    throw new ValidationError('必須提供 credential 或 credentialId');
  }

  let credentialToVerify = credential;

  // 如果只提供 credentialId，從資料庫獲取憑證
  if (!credentialToVerify && credentialId) {
    const kycRecord = await prisma.kycRecord.findFirst({
      where: { credentialId },
    });

    if (!kycRecord || !kycRecord.verifiableCredential) {
      throw new NotFoundError('找不到憑證');
    }

    credentialToVerify = kycRecord.verifiableCredential;
  }

  logger.info('🔍 開始驗證 Verifiable Credential', {
    credentialId: credentialToVerify.id || credentialId,
    userId: req.user?.id,
  });

  // 呼叫 Self Service 的驗證方法
  const result = await selfService.verifyCredential(credentialToVerify);

  logger.info(result.isValid ? '✅ 憑證驗證通過' : '❌ 憑證驗證失敗', {
    credentialId: credentialToVerify.id || credentialId,
    reason: result.reason,
  });

  return res.json({
    success: true,
    data: result,
  });
});

/**
 * 獲取 KYC 統計資料 (管理員)
 *
 * GET /admin/kyc/stats
 */
export const getKycStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
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
      failed: rejected, // Frontend expects 'failed' field
      verificationRate: parseFloat(verificationRate as string),
    },
  });
});

/**
 * Self Protocol 快速驗證端點
 *
 * POST /api/v1/kyc/self-verify
 * 用於驗證 Self Protocol 提供的零知識證明並自動完成 KYC
 */
export const selfVerify = asyncHandler(async (req: AuthRequest, res: Response) => {
  // 先記錄完整的 request body 以便調試
  logger.info('🚀 收到 Self Protocol 驗證請求 - 完整 body', {
    body: req.body,
    hasUser: !!req.user,
    userId: req.user?.id
  });

  const { attestationId, proof, publicSignals, userContextData } = req.body;

  logger.info('📋 解析後的請求參數', {
    attestationId,
    hasProof: !!proof,
    hasPublicSignals: !!publicSignals,
    userContextData,
    hasUserDefinedData: !!req.body.userDefinedData,
    userDefinedDataRaw: req.body.userDefinedData
  });

  // 1. 驗證必要參數
  if (!attestationId || !proof || !publicSignals) {
    throw new ValidationError('缺少必要參數: attestationId, proof, publicSignals');
  }

  // 2. 從 userContextData 或 req.body 獲取用戶信息
  // Self Protocol 會將 userDefinedData 放在 userContextData 中（hex 編碼）
  let userId: string | undefined;
  let parsedUserData: any = {};

  // 嘗試解析 userContextData（從 Self Protocol 傳來的 hex 編碼數據）
  if (userContextData) {
    try {
      // userContextData 是 hex 編碼的字符串，需要解碼
      // 格式: 前面是一些固定字節，後面是 JSON 數據的 hex
      logger.info('🔍 開始解析 userContextData', {
        userContextData: userContextData.substring(0, 100) + '...',
        length: userContextData.length
      });

      // 找到 JSON 數據的開始位置（尋找 '{' 的 hex 編碼 = 7b）
      const jsonStartIndex = userContextData.indexOf('7b');
      if (jsonStartIndex !== -1) {
        const jsonHex = userContextData.substring(jsonStartIndex);
        // 將 hex 轉換為字符串
        const jsonString = Buffer.from(jsonHex, 'hex').toString('utf8');
        parsedUserData = JSON.parse(jsonString);
        logger.info('✅ 成功解析 userContextData', { parsedUserData });
      } else {
        logger.warn('⚠️ userContextData 中找不到 JSON 數據');
      }
    } catch (error) {
      logger.warn('⚠️ 無法解析 userContextData', {
        error: error instanceof Error ? error.message : String(error),
        userContextData: userContextData.substring(0, 100)
      });
    }
  }

  // 備用：嘗試解析 userDefinedData（舊版本支援）
  if (!parsedUserData.userId && req.body.userDefinedData) {
    try {
      parsedUserData = JSON.parse(req.body.userDefinedData);
      logger.info('📦 解析 userDefinedData (備用)', { parsedUserData });
    } catch (error) {
      logger.warn('⚠️ 無法解析 userDefinedData', { userDefinedData: req.body.userDefinedData });
    }
  }

  // 優先使用認證用戶（如果有登入）
  if (req.user) {
    userId = req.user.id;
  }
  // 從 userDefinedData 中獲取（這是我們在 QR Code 中編碼的用戶信息）
  else if (parsedUserData.userId) {
    userId = parsedUserData.userId;
  }
  // 從 wallet address 查找用戶
  else if (parsedUserData.walletAddress) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: parsedUserData.walletAddress },
      select: { id: true }
    });
    if (user) {
      userId = user.id;
    }
  }
  // 從 userContextData 中獲取（備用）
  else if (userContextData?.userId) {
    userId = userContextData.userId;
  }
  else if (userContextData?.walletAddress) {
    const user = await prisma.user.findUnique({
      where: { walletAddress: userContextData.walletAddress },
      select: { id: true }
    });
    if (user) {
      userId = user.id;
    }
  }

  if (!userId) {
    throw new ValidationError('無法識別用戶身份。請確保已登入或在 QR Code 中包含用戶信息');
  }

  logger.info('✅ 識別用戶身份', { userId, parsedUserData });

  // 2. 檢查是否已有待審核或已通過的 KYC 記錄
  const existingKyc = await prisma.kycRecord.findFirst({
    where: {
      userId,
      status: {
        in: ['PENDING', 'VERIFIED']
      }
    }
  });

  if (existingKyc) {
    logger.warn('⚠️ 用戶已有 KYC 記錄', { userId, kycStatus: existingKyc.status });
    throw new ValidationError('您已有待審核或已通過的 KYC 記錄');
  }

  // 3. 驗證 Self Protocol 的零知識證明
  logger.info('🔍 開始驗證 Self Protocol 零知識證明', { userId, attestationId });

  const verificationResult = await selfProtocolService.verifySelfProof({
    attestationId,
    proof,
    publicSignals,
    userContextData
  });

  if (!verificationResult.isValid) {
    logger.error('❌ Self Protocol 驗證失敗', {
      userId,
      attestationId,
      errorMessage: verificationResult.errorMessage,
      checks: verificationResult.checks
    });
    throw new ValidationError(
      `身份驗證失敗: ${verificationResult.errorMessage || '未知原因'}`
    );
  }

  logger.info('✅ Self Protocol 驗證成功', {
    userId,
    attestationId,
    checks: verificationResult.checks,
    userIdentifier: verificationResult.userIdentifier
  });

  // 4. 獲取或創建用戶 W3C DID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, did: true, didDocument: true, walletAddress: true }
  });

  if (!user) {
    throw new NotFoundError('使用者不存在');
  }

  let userDID = user.did;
  let didDocument = user.didDocument;

  // 如果用戶還沒有 W3C DID，為其創建
  if (!userDID || !userDID.startsWith('did:key:')) {
    logger.info('🆔 為用戶創建 W3C DID', { userId, walletAddress: user.walletAddress });

    const didResult = await selfService.createDID(user.walletAddress!);
    userDID = didResult.did;
    didDocument = didResult.didDocument as any;

    await prisma.user.update({
      where: { id: userId },
      data: {
        did: userDID,
        didDocument: didDocument as any,
        didSeed: didResult.seed
      }
    });

    logger.info('✅ W3C DID 創建成功', { userId, did: userDID });
  }

  // 5. 從 Self Protocol 披露的數據中提取信息
  const disclosedData = verificationResult.disclosedData || {};

  // 提取姓名（嘗試多個可能的欄位名稱）
  const fullName = disclosedData.fullName
    || disclosedData.name
    || 'Self Protocol Verified User';

  // 提取護照號碼
  const passportNumber = disclosedData.documentNumber
    || disclosedData.passportNumber
    || `SELF-${attestationId.slice(0, 8).toUpperCase()}`;

  // 提取國籍
  const nationality = disclosedData.nationality
    || disclosedData.country
    || 'Unknown';

  // 提取出生日期
  let dateOfBirth: Date;
  if (disclosedData.dateOfBirth) {
    dateOfBirth = new Date(disclosedData.dateOfBirth);
  } else if (disclosedData.age) {
    // 如果只有年齡，估算出生年份
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - parseInt(disclosedData.age.toString());
    dateOfBirth = new Date(`${birthYear}-01-01`);
  } else {
    // 默認值（如果年齡驗證通過，至少是18歲以上）
    const currentYear = new Date().getFullYear();
    dateOfBirth = new Date(`${currentYear - 18}-01-01`);
  }

  logger.info('📋 提取的用戶數據', {
    fullName,
    passportNumber,
    nationality,
    dateOfBirth: dateOfBirth.toISOString()
  });

  // 6. 簽發 W3C 可驗證憑證（復用現有 selfService）
  logger.info('📜 簽發 KYC 可驗證憑證', { userId, userDID });

  const credential = await selfService.issueKYCCredential({
    userDID,
    fullName,
    passportNumber,
    nationality,
    dateOfBirth,
    verificationLevel: 'ADVANCED' // Self Protocol 驗證等級更高
  });

  logger.info('✅ KYC 可驗證憑證簽發成功', {
    userId,
    credentialId: credential.id,
    issuer: credential.issuer
  });

  // 7. 計算 DID Document Hash
  const didDocumentHash = await selfService.hashDIDDocument(didDocument as any);

  // 🔗 8. Celo 鏈上驗證（額外的公開驗證）
  let celoTxHash: string | undefined;
  let celoBlockNumber: number | undefined;
  let celoProofHash: string | undefined;

  if (celoVerifierService.isAvailable() && user.walletAddress) {
    try {
      logger.info('🔗 開始 Celo 鏈上驗證', {
        userId,
        walletAddress: user.walletAddress
      });

      // 將 proof 和 publicSignals 轉為 hex
      const proofHex = '0x' + Buffer.from(JSON.stringify(proof)).toString('hex');
      const publicSignalsHex = '0x' + Buffer.from(JSON.stringify(publicSignals)).toString('hex');

      // 計算 proof hash
      const ethers = await import('ethers');
      celoProofHash = ethers.ethers.keccak256(
        ethers.ethers.solidityPacked(
          ['bytes', 'bytes', 'address'],
          [proofHex, publicSignalsHex, user.walletAddress]
        )
      );

      // 呼叫 Celo 鏈上驗證
      const celoResult = await celoVerifierService.verifyOnChain({
        proof: proofHex,
        publicSignals: publicSignalsHex,
        nationality: nationality,
        age: disclosedData.age || 18,
        ofacClear: verificationResult.checks.ofacClear,
        userAddress: user.walletAddress
      });

      if (celoResult.success) {
        celoTxHash = celoResult.txHash;
        celoBlockNumber = celoResult.blockNumber;

        logger.info('✅ Celo 鏈上驗證成功', {
          txHash: celoTxHash,
          blockNumber: celoBlockNumber,
          gasUsed: celoResult.gasUsed,
          explorerUrl: `https://alfajores.celoscan.io/tx/${celoTxHash}`
        });
      } else {
        logger.warn('⚠️  Celo 鏈上驗證失敗，但 KYC 仍然通過（後端驗證已完成）', {
          error: celoResult.error
        });
      }
    } catch (error) {
      logger.error('❌ Celo 鏈上驗證發生錯誤，但 KYC 仍然通過（後端驗證已完成）', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    logger.info('ℹ️  Celo 鏈上驗證未啟用（CELO_VERIFIER_CONTRACT 或 CELO_PRIVATE_KEY 未配置）');
  }

  // 9. 創建 KYC 記錄（直接標記為 VERIFIED，無需管理員審核）
  const kycRecord = await prisma.kycRecord.create({
    data: {
      userId,
      passportNumber,
      fullName,
      nationality,
      dateOfBirth,
      passportImageUrl: 'self-protocol-nfc-verified', // 標記為 Self Protocol NFC 驗證
      faceImageUrl: 'self-protocol-biometric-verified', // 標記為 Self Protocol 生物識別驗證
      status: 'VERIFIED', // 🔥 直接驗證通過，無需人工審核
      verifiedAt: new Date(),
      reviewedAt: new Date(),
      // W3C 可驗證憑證
      verifiableCredential: credential as any,
      credentialId: credential.id,
      issuerDID: credential.issuer,
      didDocumentHash,
      // 🔗 Celo 鏈上驗證數據
      celoTxHash,
      celoBlockNumber,
      celoProofHash,
      celoVerifiedAt: celoTxHash ? new Date() : undefined,
      // Self Protocol 驗證元數據（可選，用於審計）
      // selfProtocolProof: {
      //   attestationId,
      //   userIdentifier: verificationResult.userIdentifier,
      //   checks: verificationResult.checks,
      //   verifiedAt: new Date().toISOString()
      // } as any
    }
  });

  logger.info('✅ KYC 記錄創建成功', {
    kycRecordId: kycRecord.id,
    userId,
    status: kycRecord.status
  });

  // 9. 更新用戶 KYC 狀態為 VERIFIED
  await prisma.user.update({
    where: { id: userId },
    data: { kycStatus: 'VERIFIED' }
  });

  // 10. 創建通知
  await prisma.notification.create({
    data: {
      userId,
      title: 'KYC 驗證成功 🎉',
      message: '恭喜！您已通過 Self Protocol 快速驗證，現在可以使用完整的平台功能。',
      type: 'KYC_APPROVED'
    }
  });

  logger.info('🎉 Self Protocol KYC 驗證流程完成', {
    userId,
    kycRecordId: kycRecord.id,
    credentialId: credential.id
  });

  return res.status(201).json({
    success: true,
    message: 'KYC 驗證成功',
    data: {
      id: kycRecord.id,
      status: kycRecord.status,
      verifiedAt: kycRecord.verifiedAt,
      fullName: kycRecord.fullName,
      nationality: kycRecord.nationality,
      // W3C DID 和憑證信息
      did: userDID,
      credentialId: credential.id,
      didDocumentHash,
      // Self Protocol 驗證檢查結果
      checks: verificationResult.checks,
      // 🔗 Celo 鏈上驗證信息
      celo: celoTxHash ? {
        txHash: celoTxHash,
        blockNumber: celoBlockNumber,
        proofHash: celoProofHash,
        verifiedAt: kycRecord.celoVerifiedAt,
        explorerUrl: `https://alfajores.celoscan.io/tx/${celoTxHash}`
      } : undefined
    }
  });
});
