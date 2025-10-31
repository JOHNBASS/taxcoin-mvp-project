import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '@/types/index.js';
import { extractToken, verifyToken } from '@/utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '@/utils/errors.js';
import { logger } from '@/utils/logger.js';

// Re-export AuthRequest so controllers can import it from here
export type { AuthRequest };

/**
 * JWT 認證中間件
 * 驗證請求的 JWT token 並將使用者資訊附加到 request 物件
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    logger.info('開始認證', { path: req.path, hasAuth: !!req.headers.authorization });

    // 提取 token
    const token = extractToken(req.headers.authorization);

    // 驗證 token
    const payload = verifyToken(token);

    // 將使用者資訊附加到 request
    req.user = payload;

    logger.info('使用者認證成功', {
      userId: payload.userId,
      role: payload.role,
    });

    next();
  } catch (error) {
    logger.error('認證失敗', { error, path: req.path });
    next(error);
  }
};

/**
 * 角色授權中間件工廠函數
 * @param allowedRoles - 允許的角色列表
 * @returns Express 中間件函數
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      logger.info('授權檢查', {
        path: req.path,
        user: req.user?.userId,
        role: req.user?.role,
        allowedRoles
      });

      // 確保使用者已認證
      if (!req.user) {
        throw new UnauthorizedError('請先登入');
      }

      // 檢查角色權限
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('使用者無權限訪問', {
          userId: req.user.userId,
          role: req.user.role,
          allowedRoles,
        });

        throw new ForbiddenError('無權限執行此操作');
      }

      logger.info('授權通過', { userId: req.user.userId });
      next();
    } catch (error) {
      logger.error('授權失敗', { error });
      next(error);
    }
  };
};

/**
 * 可選認證中間件
 * 如果提供 token 則驗證,否則繼續執行
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
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
  } catch (error) {
    // 可選認證失敗不阻止請求
    logger.debug('可選認證失敗,繼續執行');
    next();
  }
};

/**
 * 檢查使用者是否為資源擁有者或管理員
 * @param resourceUserId - 資源擁有者的使用者 ID
 */
export const checkOwnership = (resourceUserId: string) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('請先登入');
      }

      // 管理員或資源擁有者可以訪問
      const isOwner = req.user.userId === resourceUserId;
      const isAdmin = req.user.role === UserRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new ForbiddenError('無權限訪問此資源');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
