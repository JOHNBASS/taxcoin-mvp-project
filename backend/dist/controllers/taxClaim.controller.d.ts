import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
export declare const createTaxClaim: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyTaxClaims: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTaxClaimById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllTaxClaims: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reviewTaxClaim: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTaxClaimStats: (_req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=taxClaim.controller.d.ts.map