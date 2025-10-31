import { Request, Response } from 'express';
export declare const getNonce: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const walletLogin: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.controller.d.ts.map