import jwt from 'jsonwebtoken';
import { config } from '@/config/index.js';
import { JwtPayload } from '@/types/index.js';
import { UnauthorizedError } from './errors.js';

/**
 * 生成 JWT Token
 * @param payload - JWT payload 資料
 * @returns JWT token 字串
 */
export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: 'taxcoin-api',
    audience: 'taxcoin-client',
  } as any);
};

/**
 * 驗證 JWT Token
 * @param token - JWT token 字串
 * @returns 解析後的 payload
 * @throws UnauthorizedError 如果 token 無效或過期
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'taxcoin-api',
      audience: 'taxcoin-client',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token 已過期');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Token 無效');
    }

    throw new UnauthorizedError('Token 驗證失敗');
  }
};

/**
 * 從 Authorization header 提取 token
 * @param authHeader - Authorization header 值
 * @returns Token 字串
 * @throws UnauthorizedError 如果 header 格式錯誤
 */
export const extractToken = (authHeader?: string): string => {
  if (!authHeader) {
    throw new UnauthorizedError('缺少 Authorization header');
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    throw new UnauthorizedError('Authorization header 格式錯誤');
  }

  return parts[1];
};

/**
 * 刷新 Token (生成新的 token)
 * @param oldToken - 舊的 JWT token
 * @returns 新的 JWT token
 */
export const refreshToken = (oldToken: string): string => {
  try {
    // 驗證舊 token (允許過期)
    const decoded = jwt.verify(oldToken, config.jwt.secret, {
      ignoreExpiration: true,
    }) as JwtPayload;

    // 生成新 token
    const newPayload: JwtPayload = {
      id: decoded.userId,
      userId: decoded.userId,
      did: decoded.did,
      role: decoded.role,
    };

    return generateToken(newPayload);
  } catch (error) {
    throw new UnauthorizedError('Token 刷新失敗');
  }
};
