/**
 * 商品控制器
 * 處理商品相關的 HTTP 請求
 */

import { Response } from 'express';
import { AuthRequest } from '@/middlewares/auth.middleware.js';
import * as productService from '@/services/product.service.js';
import * as merchantService from '@/services/merchant.service.js';
import { logger } from '@/utils/logger.js';
import { ValidationError, BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import { ProductStatus } from '@prisma/client';

/**
 * 創建商品
 * POST /api/products
 */
export const createProduct = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const {
    name,
    description,
    price,
    stock,
    category,
    imageUrl,
  } = req.body;

  // 驗證必要欄位
  if (!name || !description || price === undefined || stock === undefined || !category) {
    throw new ValidationError('缺少必要欄位');
  }

  if (price < 0 || stock < 0) {
    throw new ValidationError('價格和庫存不能為負數');
  }

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('創建商品', { merchantId: merchant.id, productName: name });

  const product = await productService.createProduct(merchant.id, {
    name,
    description,
    price,
    stock,
    category,
    imageUrl,
  });

  return res.status(201).json({
    success: true,
    data: { product },
  });
};

/**
 * 獲取商品詳情
 * GET /api/products/:id
 */
export const getProduct = async (req: AuthRequest, res: Response) => {
  const productId = req.params.id;
  if (!productId) throw new ValidationError("缺少商品 ID");

  logger.info('獲取商品詳情', { productId });

  const product = await productService.getProductById(productId);

  return res.json({
    success: true,
    data: { product },
  });
};

/**
 * 獲取店家的商品列表
 * GET /api/merchants/:merchantId/products
 */
export const getMerchantProducts = async (req: AuthRequest, res: Response) => {
  const merchantId = req.params.merchantId;
  if (!merchantId) {
    throw new ValidationError('缺少店家 ID');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as ProductStatus | undefined;
  const category = req.query.category as string | undefined;

  logger.info('獲取店家商品列表', { merchantId, page, limit, status, category });

  const result = await productService.getProductsByMerchant(merchantId, {
    page,
    limit,
    status,
    category,
  });

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 獲取當前店家的商品列表
 * GET /api/products/my/list
 */
export const getMyProducts = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as ProductStatus | undefined;
  const category = req.query.category as string | undefined;

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('獲取當前店家商品列表', { merchantId: merchant.id, page, limit });

  const result = await productService.getProductsByMerchant(merchant.id, {
    page,
    limit,
    status,
    category,
  });

  return res.json({
    success: true,
    data: result,
  });
};

/**
 * 更新商品
 * PUT /api/products/:id
 */
export const updateProduct = async (req: AuthRequest, res: Response) => {
  const productId = req.params.id;
  if (!productId) throw new ValidationError("缺少商品 ID");
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");
  const {
    name,
    description,
    price,
    stock,
    category,
    imageUrl,
    status,
  } = req.body;

  if (price !== undefined && price < 0) {
    throw new ValidationError('價格不能為負數');
  }

  if (stock !== undefined && stock < 0) {
    throw new ValidationError('庫存不能為負數');
  }

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('更新商品', { productId, merchantId: merchant.id });

  const product = await productService.updateProduct(productId, merchant.id, {
    name,
    description,
    price,
    stock,
    category,
    imageUrl,
    status,
  });

  return res.json({
    success: true,
    data: { product },
  });
};

/**
 * 刪除商品（軟刪除）
 * DELETE /api/products/:id
 */
export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const productId = req.params.id;
  if (!productId) throw new ValidationError("缺少商品 ID");
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('刪除商品', { productId, merchantId: merchant.id });

  await productService.deleteProduct(productId, merchant.id);

  return res.json({
    success: true,
    data: { message: '商品已刪除' },
  });
};

/**
 * 獲取商品分類列表
 * GET /api/products/categories
 */
export const getProductCategories = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) throw new ValidationError("用戶未認證");

  // 獲取用戶的店家
  const merchant = await merchantService.getMerchantByUserId(userId);
  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '您尚未註冊店家');
  }

  logger.info('獲取商品分類列表', { merchantId: merchant.id });

  const categories = await productService.getProductCategories(merchant.id);

  return res.json({
    success: true,
    data: { categories },
  });
};
