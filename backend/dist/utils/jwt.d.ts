import { JwtPayload } from '../types/index.js';
export declare const generateToken: (payload: JwtPayload) => string;
export declare const verifyToken: (token: string) => JwtPayload;
export declare const extractToken: (authHeader?: string) => string;
export declare const refreshToken: (oldToken: string) => string;
//# sourceMappingURL=jwt.d.ts.map