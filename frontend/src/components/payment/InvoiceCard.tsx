/**
 * 發票卡片組件
 * 用於顯示發票資訊
 */

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice } from '@/types/payment';

interface InvoiceCardProps {
  invoice: Invoice;
  onDownload?: (invoiceId: string) => void;
  onVoid?: (invoiceId: string) => void;
  showActions?: boolean;
  className?: string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onDownload,
  onVoid,
  showActions = true,
  className = '',
}) => {
  const isVoided = invoice.status === 'VOIDED';
  const invoiceDate = new Date(invoice.invoiceDate).toLocaleDateString('zh-TW');

  const handleVoid = () => {
    const reason = window.prompt('請輸入作廢原因：');
    if (reason) {
      onVoid?.(invoice.id);
    }
  };

  return (
    <div
      className={`invoice-card bg-white rounded-lg shadow-md overflow-hidden ${className}`}
    >
      {/* Invoice Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">電子發票</h3>
            <p className="text-sm text-gray-600 mt-1">Electronic Invoice</p>
          </div>

          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${
              isVoided
                ? 'bg-red-100 text-red-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {isVoided ? '已作廢' : '有效'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">發票號碼</p>
            <p className="font-mono font-semibold text-lg">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-gray-600">開立日期</p>
            <p className="font-semibold">{invoiceDate}</p>
          </div>
        </div>
      </div>

      {/* Merchant Info */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">賣方資訊</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">店家名稱</p>
            <p className="font-semibold">{invoice.merchantName}</p>
          </div>
          <div>
            <p className="text-gray-600">統一編號</p>
            <p className="font-mono font-semibold">{invoice.merchantTaxId}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">商品明細</h4>
        <div className="space-y-2">
          {invoice.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <div className="flex-1">
                <span className="font-medium">{item.name}</span>
                <span className="text-gray-600 ml-2">
                  x{item.quantity} @ NT$ {item.unitPrice}
                </span>
              </div>
              <div className="font-semibold">
                NT$ {item.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="p-6 border-b border-gray-200">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">小計</span>
            <span>NT$ {invoice.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">稅額 ({(invoice.taxRate * 100).toFixed(0)}%)</span>
            <span>NT$ {invoice.tax.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span>總計</span>
            <span className="text-blue-600">
              NT$ {invoice.total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-center">
        <div className="text-center">
          <QRCodeSVG
            value={invoice.qrCodeData}
            size={150}
            level="M"
            includeMargin={true}
          />
          <p className="text-xs text-gray-600 mt-2">發票 QR Code</p>
        </div>
      </div>

      {/* Void Info */}
      {isVoided && (
        <div className="p-6 bg-red-50 border-b border-red-200">
          <p className="text-sm font-semibold text-red-800">作廢資訊</p>
          <p className="text-sm text-red-600 mt-1">
            作廢時間: {new Date(invoice.voidedAt!).toLocaleString('zh-TW')}
          </p>
          {invoice.voidReason && (
            <p className="text-sm text-red-600 mt-1">
              作廢原因: {invoice.voidReason}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="p-6 flex gap-3">
          <button
            onClick={() => onDownload?.(invoice.id)}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
          >
            下載 PDF
          </button>

          {!isVoided && onVoid && (
            <button
              onClick={handleVoid}
              className="py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200 font-semibold"
            >
              作廢發票
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceCard;
