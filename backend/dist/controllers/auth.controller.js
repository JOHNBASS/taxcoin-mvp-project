import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { generateLoginMessage, verifyWalletSignature, generateNonce, validateNonce, deriveAddressFromPublicKey, } from '../utils/wallet.js';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors.js';
import { UserRole } from '../types/index.js';
import { logger } from '../utils/logger.js';
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
    role: z.enum([UserRole.TOURIST, UserRole.INVESTOR], {
        errorMap: () => ({ message: '角色必須是 TOURIST 或 INVESTOR' }),
    }),
    email: z.string().email('Email 格式錯誤').optional(),
    phoneNumber: z.string().optional(),
});
export const getNonce = async (req, res) => {
    const parseResult = getNonceSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { walletAddress } = parseResult.data;
    const nonce = generateNonce();
    const message = generateLoginMessage(walletAddress, nonce);
    logger.info('生成登入 nonce', { walletAddress });
    const response = {
        success: true,
        data: {
            nonce,
            message,
            expiresIn: 300,
        },
    };
    return res.json(response);
};
export const walletLogin = async (req, res) => {
    const parseResult = walletLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { walletAddress, signature, publicKey, message, nonce } = parseResult.data;
    if (!validateNonce(nonce)) {
        throw new UnauthorizedError('Nonce 無效或已過期');
    }
    const isValidSignature = await verifyWalletSignature(message, signature, publicKey);
    if (!isValidSignature) {
        throw new UnauthorizedError('簽名驗證失敗');
    }
    const derivedAddress = deriveAddressFromPublicKey(publicKey);
    if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedError('錢包地址與公鑰不匹配');
    }
    const user = await prisma.user.findUnique({
        where: { walletAddress },
    });
    if (!user) {
        throw new NotFoundError('使用者不存在,請先註冊');
    }
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
    const response = {
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
export const register = async (req, res) => {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
        throw new ValidationError('請求參數錯誤', parseResult.error.errors);
    }
    const { walletAddress, role, email, phoneNumber } = parseResult.data;
    const existingUser = await prisma.user.findUnique({
        where: { walletAddress },
    });
    if (existingUser) {
        throw new ValidationError('此錢包地址已註冊');
    }
    if (email) {
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            throw new ValidationError('此 Email 已被使用');
        }
    }
    const user = await prisma.user.create({
        data: {
            did: `did:sui:${walletAddress.substring(2, 12)}`,
            walletAddress,
            role,
            email,
            phoneNumber,
        },
    });
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
    const response = {
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
export const refreshToken = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new UnauthorizedError('缺少 Authorization header');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new UnauthorizedError('Token 格式錯誤');
    }
    const response = {
        success: true,
        data: {
            message: 'Token 刷新功能即將推出',
        },
    };
    return res.json(response);
};
//# sourceMappingURL=auth.controller.js.map