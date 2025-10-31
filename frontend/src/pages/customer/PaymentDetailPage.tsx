/**
 * 支付詳情頁面 - Web3 風格
 * 顯示單筆支付交易的詳細信息
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { paymentService } from '@/services/payment.service';
import type { Payment, PaymentStatus } from '@/types/payment';

const statusColors: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  COMPLETED: 'bg-green-500/20 text-green-300 border-green-500/50',
  FAILED: 'bg-red-500/20 text-red-300 border-red-500/50',
  CANCELLED: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
};

const statusLabels: Record<PaymentStatus, string> = {
  PENDING: '處理中',
  COMPLETED: '已完成',
  FAILED: '失敗',
  CANCELLED: '已取消',
};

const statusIcons: Record<PaymentStatus, string> = {
  PENDING: '⏳',
  COMPLETED: '✓',
  FAILED: '✕',
  CANCELLED: '⊗',
};

export const PaymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentDetail();
  }, [id]);

  const fetchPaymentDetail = async () => {
    if (!id) {
      setError('缺少支付 ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await paymentService.getPaymentById(id);
      setPayment(data);
    } catch (err) {
      console.error('Failed to fetch payment detail:', err);
      setError(err instanceof Error ? err.message : '無法載入支付詳情');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-12 text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
          </div>
          <p className="text-cyan-200 font-semibold">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20 p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-300 mb-2">載入失敗</h2>
          <p className="text-red-200 mb-6">{error || '找不到支付記錄'}</p>
          <button
            onClick={() => navigate('/payment/history')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg shadow-purple-500/50"
          >
            返回交易記錄
          </button>
        </div>
      </div>
    );
  }

  const items = payment.items as any[] || [];

  return (
    <div className="payment-detail-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Button */}
        <Link
          to="/payment/history"
          className="inline-flex items-center gap-2 mb-6 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          ← 返回交易記錄
        </Link>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            支付詳情
          </h1>
          <p className="text-cyan-100 text-lg">訂單編號: {payment.orderNumber}</p>
        </div>

        {/* Status Banner */}
        <div className={`backdrop-blur-xl border rounded-2xl p-4 mb-6 text-center shadow-lg ${statusColors[payment.status]}`}>
          <div className="text-3xl mb-2">{statusIcons[payment.status]}</div>
          <div className="text-xl font-bold">{statusLabels[payment.status]}</div>
        </div>

        {/* Merchant Info */}
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            🏪 店家資訊
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-cyan-500/20">
              <span className="text-cyan-300 font-semibold">店家名稱</span>
              <span className="font-bold text-white">{payment.merchant?.merchantName || '-'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-purple-500/20">
              <span className="text-purple-300 font-semibold">統一編號</span>
              <span className="font-mono text-white">{payment.merchant?.taxId || '-'}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="backdrop-blur-xl bg-white/10 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 mb-6">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              🛒 商品明細
            </h2>
            <div className="space-y-3">
              {items.map((item: any, index: number) => (
                <div key={index} className="p-4 bg-slate-900/30 rounded-xl border border-purple-500/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-sm text-cyan-300">單價: NT$ {item.unitPrice?.toLocaleString() || 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-purple-300">數量: {item.quantity}</div>
                      <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                        NT$ {item.amount?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/30 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-4">
            💰 金額摘要
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
              <span className="text-purple-200">小計</span>
              <span className="text-white font-semibold">NT$ {payment.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
              <span className="text-purple-200">稅額 (5%)</span>
              <span className="text-white font-semibold">NT$ {payment.tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-purple-500/30 pt-3 flex justify-between p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl text-lg">
              <span className="font-bold text-cyan-300">總計</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 text-xl">
                NT$ {payment.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            📝 交易資訊
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
              <span className="text-cyan-300 font-semibold">創建時間</span>
              <span className="text-white">{new Date(payment.createdAt).toLocaleString('zh-TW')}</span>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
                <span className="text-cyan-300 font-semibold">支付時間</span>
                <span className="text-white">{new Date(payment.paidAt).toLocaleString('zh-TW')}</span>
              </div>
            )}
            {payment.transactionHash && (
              <div className="p-3 bg-slate-900/30 rounded-xl">
                <div className="text-cyan-300 font-semibold mb-2">交易哈希</div>
                <div className="font-mono text-xs text-white break-all bg-slate-900/50 p-2 rounded">
                  {payment.transactionHash}
                </div>
                <a
                  href={`https://suiscan.xyz/testnet/tx/${payment.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  在區塊鏈瀏覽器查看 →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        {payment.invoice && (
          <div className="backdrop-blur-xl bg-white/10 border border-green-500/30 rounded-2xl shadow-2xl shadow-green-500/20 p-6">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400 mb-4">
              📄 電子發票
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
                <span className="text-green-300 font-semibold">發票號碼</span>
                <span className="font-mono text-white">{payment.invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
                <span className="text-green-300 font-semibold">開立時間</span>
                <span className="text-white">{new Date(payment.invoice.invoiceDate).toLocaleString('zh-TW')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetailPage;
