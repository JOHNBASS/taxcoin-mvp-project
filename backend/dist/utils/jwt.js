import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from './errors';
export const generateToken = (payload) => {
    return jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'taxcoin-api',
        audience: 'taxcoin-client',
    });
};
export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, config.jwt.secret, {
            issuer: 'taxcoin-api',
            audience: 'taxcoin-client',
        });
        return decoded;
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new UnauthorizedError('Token 已過期');
        }
        if (error instanceof jwt.JsonWebTokenError) {
            throw new UnauthorizedError('Token 無效');
        }
        throw new UnauthorizedError('Token 驗證失敗');
    }
};
export const extractToken = (authHeader) => {
    if (!authHeader) {
        throw new UnauthorizedError('缺少 Authorization header');
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
        throw new UnauthorizedError('Authorization header 格式錯誤');
    }
    return parts[1];
};
export const refreshToken = (oldToken) => {
    try {
        const decoded = jwt.verify(oldToken, config.jwt.secret, {
            ignoreExpiration: true,
        });
        const newPayload = {
            id: decoded.userId,
            userId: decoded.userId,
            did: decoded.did,
            role: decoded.role,
        };
        return generateToken(newPayload);
    }
    catch (error) {
        throw new UnauthorizedError('Token 刷新失敗');
    }
};
//# sourceMappingURL=jwt.js.map