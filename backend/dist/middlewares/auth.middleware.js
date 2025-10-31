import { UserRole } from '../types/index.js';
import { extractToken, verifyToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
export const authenticate = async (req, _res, next) => {
    try {
        const token = extractToken(req.headers.authorization);
        const payload = verifyToken(token);
        req.user = payload;
        logger.debug('使用者認證成功', {
            userId: payload.userId,
            role: payload.role,
        });
        next();
    }
    catch (error) {
        next(error);
    }
};
export const authorize = (...allowedRoles) => {
    return (req, _res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('請先登入');
            }
            if (!allowedRoles.includes(req.user.role)) {
                logger.warn('使用者無權限訪問', {
                    userId: req.user.userId,
                    role: req.user.role,
                    allowedRoles,
                });
                throw new ForbiddenError('無權限執行此操作');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const optionalAuthenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = extractToken(authHeader);
            const payload = verifyToken(token);
            req.user = payload;
            logger.debug('可選認證成功', {
                userId: payload.userId,
            });
        }
        next();
    }
    catch (error) {
        logger.debug('可選認證失敗,繼續執行');
        next();
    }
};
export const checkOwnership = (resourceUserId) => {
    return (req, _res, next) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError('請先登入');
            }
            const isOwner = req.user.userId === resourceUserId;
            const isAdmin = req.user.role === UserRole.ADMIN;
            if (!isOwner && !isAdmin) {
                throw new ForbiddenError('無權限訪問此資源');
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
//# sourceMappingURL=auth.middleware.js.map