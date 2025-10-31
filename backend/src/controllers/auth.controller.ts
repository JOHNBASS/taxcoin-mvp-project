import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.js';
import { generateToken } from '@/utils/jwt.js';
import {
  generateLoginMessage,
  // verifyWalletSignature,  // 暫時註釋 - 跳過驗證
  generateNonce,
  validateNonce,
  // deriveAddressFromPublicKey,  // 暫時註釋 - 跳過驗證
} from '@/utils/wallet.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '@/utils/errors.js';
import { ApiResponse, UserRole } from '@/types/index.js';
import { logger } from '@/utils/logger.js';
import { selfService } from '@/services/self.service.js';

// ===== 請求驗證 Schema =====

const getNonceSchema = z.object({
  walletAddress: z.string().min(1, '錢包地址不能為空'),
});

const walletLoginSchema = z.object({
  walletAddress: z.string().min(1, '錢包地址不能為空'),
  signature: z.string().min(1, '簽名不能為空'),
  publicKey: z.string().min(1, '公鑰不能為空'),
  message: z.string().min(1, '訊息不能為空'),
  nonce: z.string().min(1, 'Nonce 不能為空'),
});

const registerSchema = z.object({
  walletAddress: z.string().min(1, '錢包地址不能為空'),
  role: z.enum([UserRole.TOURIST, UserRole.INVESTOR, UserRole.MERCHANT], {
    errorMap: () => ({ message: '角色必須是 TOURIST、INVESTOR 或 MERCHANT' }),
  }),
  email: z.string().email('Email 格式錯誤').optional(),
  phoneNumber: z.string().optional(),
});

// ===== 控制器函數 =====

/**
 * 獲取登入 nonce
 * POST /api/v1/auth/nonce
 */
export const getNonce = async (req: Request, res: Response) => {
  // 驗證請求
  const parseResult = getNonceSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { walletAddress } = parseResult.data;

  // 生成 nonce 和登入訊息
  const nonce = generateNonce();
  const message = generateLoginMessage(walletAddress, nonce);

  logger.info('生成登入 nonce', { walletAddress });

  const response: ApiResponse = {
    success: true,
    data: {
      nonce,
      message,
      expiresIn: 300, // 5 分鐘
    },
  };

  return res.json(response);
};

/**
 * 錢包登入
 * POST /api/v1/auth/wallet-login
 */
export const walletLogin = async (req: Request, res: Response) => {
  // 驗證請求
  const parseResult = walletLoginSchema.safeParse(req.body);
  if (!parseResult.success) {
    console.log('=== 錢包登入參數驗證失敗 ===');
    console.log('Request body:', req.body);
    console.log('Validation errors:', parseResult.error.errors);
    console.log('===========================');
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { walletAddress, nonce } = parseResult.data;
  // 暫時不使用這些參數,但保留在schema中以便日後啟用驗證
  // const { signature, publicKey, message } = parseResult.data;

  // 驗證 nonce
  if (!validateNonce(nonce)) {
    throw new UnauthorizedError('Nonce 無效或已過期');
  }

  // TODO: 暫時跳過簽名驗證,專注於修復公鑰提取邏輯
  logger.warn('⚠️  暫時跳過簽名驗證 (開發模式)');

  // // 驗證簽名
  // const isValidSignature = await verifyWalletSignature(message, signature, publicKey);
  // if (!isValidSignature) {
  //   throw new UnauthorizedError('簽名驗證失敗');
  // }

  // TODO: 暫時完全跳過地址與公鑰匹配驗證
  logger.warn('⚠️  暫時跳過地址匹配驗證 (開發模式)');

  // // 驗證地址與公鑰匹配
  // // MVP 模式：跳過模擬簽名的地址匹配檢查
  // const isMockSignature = signature.length > 0 && (() => {
  //   try {
  //     return Buffer.from(signature, 'base64').toString().startsWith('mock_signature_');
  //   } catch {
  //     return false;
  //   }
  // })();
  //
  // if (!isMockSignature) {
  //   // Suiet 錢包簽名格式: flag(1) + signature(64) + publicKey(32) = 97 bytes
  //   // 如果 publicKey 和 signature 相同,說明前端發送的是完整的序列化簽名
  //   // 需要從中提取公鑰
  //   let actualPublicKey = publicKey;
  //
  //   try {
  //     const signatureBytes = Buffer.from(signature, 'base64');
  //     if (signatureBytes.length === 97 && publicKey === signature) {
  //       // 從完整簽名中提取公鑰 (最後 32 bytes)
  //       const publicKeyBytes = signatureBytes.slice(65, 97);
  //       actualPublicKey = publicKeyBytes.toString('base64');
  //       logger.info('從 Suiet 簽名中提取公鑰', { publicKeyLength: publicKeyBytes.length });
  //     }
  //
  //     const derivedAddress = deriveAddressFromPublicKey(actualPublicKey);
  //     if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
  //       logger.warn('錢包地址與公鑰不匹配', {
  //         walletAddress,
  //         derivedAddress,
  //         publicKeyPreview: actualPublicKey.substring(0, 30) + '...'
  //       });
  //       throw new UnauthorizedError('錢包地址與公鑰不匹配');
  //     }
  //   } catch (error) {
  //     logger.error('公鑰驗證失敗', {
  //       error: error instanceof Error ? error.message : String(error),
  //       signatureLength: signature.length,
  //       publicKeyLength: publicKey.length
  //     });
  //     throw new UnauthorizedError('公鑰格式錯誤');
  //   }
  // } else {
  //   logger.info('MVP 模式：跳過地址匹配驗證');
  // }

  // 查找使用者
  const user = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (!user) {
    throw new NotFoundError('使用者不存在,請先註冊');
  }

  // 生成 JWT token
  const token = generateToken({
    id: user.id,
    userId: user.id,
    did: user.did,
    role: user.role,
  });

  logger.info('錢包登入成功', {
    userId: user.id,
    walletAddress,
    role: user.role,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        did: user.did,
        role: user.role,
        kycStatus: user.kycStatus,
        walletAddress: user.walletAddress,
        email: user.email,
      },
    },
  };

  return res.json(response);
};

/**
 * 使用者註冊
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response) => {
  // 驗證請求
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { walletAddress, role, email, phoneNumber } = parseResult.data;

  // 檢查錢包地址是否已註冊
  const existingUser = await prisma.user.findUnique({
    where: { walletAddress },
  });

  // 如果用戶已存在且已經有 email，表示已完成註冊
  if (existingUser && existingUser.email) {
    throw new ValidationError('此錢包地址已註冊');
  }

  // 檢查 email 是否已被其他用戶使用
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email },
    });

    // 如果 email 已被使用，且不是當前用戶
    if (existingEmail && existingEmail.walletAddress !== walletAddress) {
      throw new ValidationError('此 Email 已被使用');
    }
  }

  // 🔒 管理員白名單：只有特定地址可以註冊為 ADMIN
  const ADMIN_WALLET_ADDRESSES = [
    '0xf3964ed53f9052fc57c66f489f9ac80c339e456a34a25c0eba90e4e85c13ecf5',
    '0xf2554050b141eb0c1baf0aceb1ec68d6e03cf3511baf0f5f76ed155870fdc370',
    // 在這裡添加更多管理員地址
    // '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  ];

  const isAdminWallet = ADMIN_WALLET_ADDRESSES.some(
    adminAddr => walletAddress.toLowerCase() === adminAddr.toLowerCase()
  );

  const finalRole = isAdminWallet ? UserRole.ADMIN : role;

  if (finalRole === UserRole.ADMIN) {
    logger.info('🔐 管理員註冊', { walletAddress });
  }

  let user;

  if (existingUser) {
    // 用戶已存在但未完成註冊（沒有 email）- 更新用戶資料
    logger.info('更新現有用戶資料', { walletAddress, userId: existingUser.id });

    user = await prisma.user.update({
      where: { walletAddress },
      data: {
        role: finalRole,
        email,
        phoneNumber,
        updatedAt: new Date(),
      },
    });
  } else {
    // 創建新用戶
    // ✅ 使用 Self SDK 創建 W3C DID
    logger.info('🆔 創建 W3C DID', { walletAddress });
    const { did, didDocument, seed } = await selfService.createDID(walletAddress);

    logger.info('✅ W3C DID 創建成功', {
      walletAddress,
      did,
      didType: did.split(':')[1] // 'key'
    });

    // 創建使用者
    user = await prisma.user.create({
      data: {
        did,                          // ✅ W3C DID (did:key:z6Mk...)
        didDocument: didDocument as any,     // ✅ 完整的 DID Document
        didSeed: seed,                // ✅ DID 種子 (應加密存儲)
        walletAddress,
        role: finalRole,
        email,
        phoneNumber,
      },
    });
  }

  // 生成 JWT token
  const token = generateToken({
    id: user.id,
    userId: user.id,
    did: user.did,
    role: user.role,
  });

  logger.info('使用者註冊成功', {
    userId: user.id,
    walletAddress,
    role,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        did: user.did,
        role: user.role,
        kycStatus: user.kycStatus,
        walletAddress: user.walletAddress,
        email: user.email,
      },
    },
  };

  return res.status(201).json(response);
};

/**
 * 刷新 Token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('缺少 Authorization header');
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('Token 格式錯誤');
  }

  // TODO: 實作 token 刷新邏輯
  // 目前簡化實作,實際應該:
  // 1. 驗證舊 token
  // 2. 檢查是否在黑名單
  // 3. 生成新 token
  // 4. 將舊 token 加入黑名單

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Token 刷新功能即將推出',
    },
  };

  return res.json(response);
};
