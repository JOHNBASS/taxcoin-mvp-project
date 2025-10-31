import { Request, Response, NextFunction } from 'express';
export declare const errorHandler: (err: Error, _req: Request, res: Response, _next: NextFunction) => Response<any, Record<string, any>>;
export declare const notFoundHandler: (_req: Request, res: Response) => Response<any, Record<string, any>>;
//# sourceMappingURL=errorHandler.d.ts.map