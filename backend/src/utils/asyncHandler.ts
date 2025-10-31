import { Request, Response, NextFunction } from 'express';

/**
 * 異步處理器包裹函數
 * 自動捕獲異步函數的錯誤並傳遞給錯誤處理中間件
 * @param fn - 異步路由處理函數
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
