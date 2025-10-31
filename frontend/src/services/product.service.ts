/**
 * Product API Service
 * 商品相關 API 請求
 */

import apiClient, { extractErrorMessage } from './api';
import type {
  Product,
  CreateProductDto,
  UpdateProductDto,
  ProductListQuery,
  ProductListResponse,
} from '@/types/payment';

export const productService = {
  /**
   * 創建商品
   */
  async createProduct(data: CreateProductDto): Promise<Product> {
    try {
      const response = await apiClient.post('/products', data);
      return response.data.data.product;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取當前店家的商品列表
   */
  async getMyProducts(query?: ProductListQuery): Promise<ProductListResponse> {
    try {
      const response = await apiClient.get('/products/my/list', {
        params: query,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取商品詳情
   */
  async getProductById(productId: string): Promise<Product> {
    try {
      const response = await apiClient.get(`/products/${productId}`);
      return response.data.data.product;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取店家的商品列表
   */
  async getProductsByMerchant(
    merchantId: string,
    query?: ProductListQuery
  ): Promise<ProductListResponse> {
    try {
      const response = await apiClient.get(
        `/merchants/${merchantId}/products`,
        {
          params: query,
        }
      );
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 更新商品
   */
  async updateProduct(productId: string, data: UpdateProductDto): Promise<Product> {
    try {
      const response = await apiClient.put(`/products/${productId}`, data);
      return response.data.data.product;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 刪除商品
   */
  async deleteProduct(productId: string): Promise<void> {
    try {
      await apiClient.delete(`/products/${productId}`);
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取商品分類列表
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get('/products/categories');
      return response.data.data.categories;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },
};
