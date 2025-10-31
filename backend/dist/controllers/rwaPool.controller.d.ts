import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
export declare const createPool: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAllPools: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPoolById: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const investToPool: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyInvestments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPoolStats: (_req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=rwaPool.controller.d.ts.map