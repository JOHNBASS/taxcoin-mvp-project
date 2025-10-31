/**
 * 商品服務
 * 處理商品管理、查詢等功能
 */

import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import type { Product, CreateProductDto, UpdateProductDto } from '@/types/payment.types.js';
import { ProductStatus } from '@prisma/client';

/**
 * 創建商品
 */
export const createProduct = async (
  merchantId: string,
  data: CreateProductDto
): Promise<Product> => {
  logger.info('創建商品', { merchantId, productName: data.name });

  // 驗證店家存在
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  if (merchant.status !== 'ACTIVE') {
    throw new BusinessError(ErrorCode.FORBIDDEN, '店家已被暫停，無法創建商品');
  }

  // 創建商品
  const product = await prisma.product.create({
    data: {
      merchantId,
      ...data,
      status: ProductStatus.ACTIVE,
    },
  });

  logger.info('商品創建成功', { productId: product.id, productName: product.name });

  return product as Product;
};

/**
 * 獲取商品詳情
 */
export const getProductById = async (productId: string): Promise<Product> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      merchant: {
        select: {
          merchantName: true,
          status: true,
        },
      },
    },
  });

  if (!product) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '商品不存在');
  }

  return product as Product;
};

/**
 * 獲取店家的商品列表
 */
export const getProductsByMerchant = async (
  merchantId: string,
  params: {
    page?: number;
    limit?: number;
    status?: ProductStatus;
    category?: string;
  }
): Promise<{
  products: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = { merchantId };
  if (params.status) {
    where.status = params.status;
  }
  if (params.category) {
    where.category = params.category;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products as Product[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 更新商品
 */
export const updateProduct = async (
  productId: string,
  merchantId: string,
  data: UpdateProductDto
): Promise<Product> => {
  logger.info('更新商品', { productId, merchantId });

  // 驗證商品存在且屬於該店家
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '商品不存在');
  }

  if (product.merchantId !== merchantId) {
    throw new BusinessError(ErrorCode.FORBIDDEN, '無權修改此商品');
  }

  // 更新商品
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data,
  });

  logger.info('商品更新成功', { productId });

  return updatedProduct as Product;
};

/**
 * 刪除商品（軟刪除 - 設為 INACTIVE）
 */
export const deleteProduct = async (productId: string, merchantId: string): Promise<void> => {
  logger.info('刪除商品', { productId, merchantId });

  // 驗證商品存在且屬於該店家
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '商品不存在');
  }

  if (product.merchantId !== merchantId) {
    throw new BusinessError(ErrorCode.FORBIDDEN, '無權刪除此商品');
  }

  // 軟刪除
  await prisma.product.update({
    where: { id: productId },
    data: { status: ProductStatus.INACTIVE },
  });

  logger.info('商品刪除成功', { productId });
};

/**
 * 批量獲取商品（用於生成 QR Code）
 */
export const getProductsByIds = async (productIds: string[]): Promise<Product[]> => {
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      status: ProductStatus.ACTIVE,
    },
  });

  return products as Product[];
};

/**
 * 扣減庫存
 */
export const decreaseStock = async (
  productId: string,
  quantity: number
): Promise<Product> => {
  logger.info('扣減商品庫存', { productId, quantity });

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '商品不存在');
  }

  if (product.stock < quantity) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, `庫存不足，當前庫存: ${product.stock}`);
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: product.stock - quantity,
    },
  });

  logger.info('商品庫存扣減成功', { productId, newStock: updatedProduct.stock });

  return updatedProduct as Product;
};

/**
 * 增加庫存（退款時使用）
 */
export const increaseStock = async (
  productId: string,
  quantity: number
): Promise<Product> => {
  logger.info('增加商品庫存', { productId, quantity });

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '商品不存在');
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: {
      stock: product.stock + quantity,
    },
  });

  logger.info('商品庫存增加成功', { productId, newStock: updatedProduct.stock });

  return updatedProduct as Product;
};

/**
 * 獲取商品分類列表
 */
export const getProductCategories = async (merchantId: string): Promise<string[]> => {
  const products = await prisma.product.findMany({
    where: { merchantId },
    select: { category: true },
    distinct: ['category'],
  });

  return products.map((p) => p.category);
};
