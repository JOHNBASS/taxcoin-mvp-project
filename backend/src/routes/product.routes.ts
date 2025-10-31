/**
 * 商品路由
 */

import { Router } from 'express';
import { authenticate, authorize } from '@/middlewares/auth.middleware.js';
import { asyncHandler } from '@/utils/asyncHandler.js';
import * as productController from '@/controllers/product.controller.js';
import { UserRole } from '@prisma/client';

const router = Router();

// 所有路由都需要身份驗證
router.use(authenticate);

/**
 * 創建商品
 * POST /api/products
 * 權限: MERCHANT
 */
router.post(
  '/',
  authorize(UserRole.MERCHANT),
  asyncHandler(productController.createProduct)
);

/**
 * 獲取當前店家的商品列表
 * GET /api/products/my/list
 * 權限: MERCHANT
 */
router.get(
  '/my/list',
  authorize(UserRole.MERCHANT),
  asyncHandler(productController.getMyProducts)
);

/**
 * 獲取商品分類列表
 * GET /api/products/categories
 * 權限: MERCHANT
 */
router.get(
  '/categories',
  authorize(UserRole.MERCHANT),
  asyncHandler(productController.getProductCategories)
);

/**
 * 獲取商品詳情
 * GET /api/products/:id
 * 權限: All authenticated users
 */
router.get(
  '/:id',
  asyncHandler(productController.getProduct)
);

/**
 * 更新商品
 * PUT /api/products/:id
 * 權限: MERCHANT
 */
router.put(
  '/:id',
  authorize(UserRole.MERCHANT),
  asyncHandler(productController.updateProduct)
);

/**
 * 刪除商品（軟刪除）
 * DELETE /api/products/:id
 * 權限: MERCHANT
 */
router.delete(
  '/:id',
  authorize(UserRole.MERCHANT),
  asyncHandler(productController.deleteProduct)
);

export default router;
