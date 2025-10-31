/**
 * 支付明細項目組件 - Web3 風格
 * 用於顯示購物車或支付記錄中的單個商品
 */

import React from 'react';
import type { PaymentItem as PaymentItemType } from '@/types/payment';

interface PaymentItemProps {
  item: PaymentItemType;
  onQuantityChange?: (productId: string, quantity: number) => void;
  onRemove?: (productId: string) => void;
  editable?: boolean;
  className?: string;
}

export const PaymentItem: React.FC<PaymentItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  editable = false,
  className = '',
}) => {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onQuantityChange?.(item.productId, newQuantity);
  };

  return (
    <div
      className={`payment-item flex items-center justify-between p-4 backdrop-blur-xl bg-slate-900/30 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all ${className}`}
    >
      {/* Product Info */}
      <div className="flex-1 pr-4">
        <h4 className="font-bold text-white">{item.name}</h4>
        <p className="text-sm text-cyan-300 mt-1">
          單價: <span className="font-semibold">NT$ {item.unitPrice.toLocaleString()}</span>
        </p>
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-4">
        {editable ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleQuantityChange(-1)}
              disabled={item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30"
            >
              −
            </button>

            <span className="w-12 text-center font-bold text-white">{item.quantity}</span>

            <button
              onClick={() => handleQuantityChange(1)}
              className="w-8 h-8 flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30"
            >
              +
            </button>
          </div>
        ) : (
          <span className="text-purple-300 font-semibold">x {item.quantity}</span>
        )}

        {/* Amount */}
        <div className="w-32 text-right">
          <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-lg">
            NT$ {item.amount.toLocaleString()}
          </p>
        </div>

        {/* Remove Button */}
        {editable && onRemove && (
          <button
            onClick={() => onRemove(item.productId)}
            className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/30 hover:border-red-500/60"
            title="移除"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentItem;
