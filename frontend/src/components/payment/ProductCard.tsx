/**
 * 商品卡片組件 - Web3 風格
 * 用於顯示商品資訊
 */

import React from 'react';
import { ProductStatus } from '@/types/payment';
import type { Product } from '@/types/payment';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onToggleStatus?: (productId: string, status: ProductStatus) => void;
  mode?: 'view' | 'select' | 'manage';
  selected?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onEdit,
  onDelete,
  onToggleStatus,
  mode = 'view',
  selected = false,
  className = '',
}) => {
  const isActive = product.status === 'ACTIVE';
  const isOutOfStock = product.stock === 0;

  return (
    <div
      className={`card bg-dark-card/80 backdrop-blur-xl border-2 transition-all duration-300 overflow-hidden group ${
        selected
          ? 'border-primary-500 shadow-glow-lg'
          : 'border-gray-800 hover:border-primary-500/50 shadow-glow'
      } ${className}`}
    >
      {/* 頂部裝飾條 */}
      <div className={`h-1 ${
        selected
          ? 'bg-gradient-to-r from-primary-500 via-accent-500 to-green-500 animate-pulse-slow'
          : 'bg-gradient-to-r from-gray-700 to-gray-800'
      }`} />

      {/* Product Image */}
      {product.imageUrl && (
        <div className="relative h-48 bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-card to-transparent opacity-60" />

          {/* Status Badge - Floating */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-sm ${
                isActive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-glow-sm'
                  : 'bg-gray-700/50 text-gray-400 border border-gray-600'
              }`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
              }`} />
              {isActive ? '上架中' : '已下架'}
            </span>
          </div>

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-400 font-bold text-sm">缺貨中</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-200 line-clamp-2 group-hover:text-primary-400 transition-colors">
            {product.name}
          </h3>
        </div>

        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {product.description}
        </p>

        <div className="flex justify-between items-center mb-3">
          <div className="text-xl font-bold text-green-400 shadow-glow-sm">
            NT$ {product.price.toLocaleString()}
          </div>

          <div className={`text-sm font-semibold ${
            isOutOfStock
              ? 'text-red-400'
              : product.stock < 10
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`}>
            <span className="text-gray-500">庫存:</span> {product.stock}
          </div>
        </div>

        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-500/20 text-accent-300 border border-accent-500/30">
            {product.category}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {mode === 'select' && onSelect && (
            <button
              onClick={() => onSelect(product)}
              disabled={!isActive || isOutOfStock}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 relative overflow-hidden group ${
                !isActive || isOutOfStock
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                  : selected
                  ? 'bg-gradient-cyber text-white shadow-glow border border-primary-500'
                  : 'bg-gray-800 text-primary-400 hover:bg-gray-700 border border-primary-500/30 hover:border-primary-500/50'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {selected && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {selected ? '已選擇' : '選擇'}
              </span>
            </button>
          )}

          {mode === 'manage' && (
            <>
              <button
                onClick={() => onEdit?.(product)}
                className="flex-1 py-2 px-3 bg-gray-800 text-primary-400 rounded-lg hover:bg-gray-700 transition-all duration-200 font-semibold border border-primary-500/30 hover:border-primary-500/50 text-sm"
              >
                編輯
              </button>

              <button
                onClick={() =>
                  onToggleStatus?.(product.id, isActive ? ProductStatus.INACTIVE : ProductStatus.ACTIVE)
                }
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all duration-200 border text-sm ${
                  isActive
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50'
                    : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50'
                }`}
              >
                {isActive ? '下架' : '上架'}
              </button>

              <button
                onClick={() => {
                  if (window.confirm('確定要刪除此商品嗎？此操作無法復原。')) {
                    onDelete?.(product.id);
                  }
                }}
                className="py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all duration-200 font-semibold border border-red-500/30 hover:border-red-500/50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
