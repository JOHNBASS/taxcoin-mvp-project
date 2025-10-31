import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types/index.js';
export declare const authenticate: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...allowedRoles: UserRole[]) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare const optionalAuthenticate: (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
export declare const checkOwnership: (resourceUserId: string) => (req: AuthRequest, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map