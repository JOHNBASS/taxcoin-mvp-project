/**
 * 支付結果頁面 - Web3 風格
 * 顯示支付成功/失敗狀態，發票資訊
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import InvoiceCard from '@/components/payment/InvoiceCard';
import { invoiceService } from '@/services/invoice.service';
import type { Payment, Invoice } from '@/types/payment';

export const PaymentResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [success, setSuccess] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  useEffect(() => {
    // Get result from navigation state
    if (location.state?.success !== undefined && location.state?.payment) {
      setSuccess(location.state.success);
      setPayment(location.state.payment);

      // Fetch invoice if payment successful
      if (location.state.success && location.state.payment.invoiceId) {
        fetchInvoice(location.state.payment.invoiceId);
      }
    } else {
      // Redirect if no data
      navigate('/payment/scan');
    }
  }, [location, navigate]);

  const fetchInvoice = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const fetchedInvoice = await invoiceService.getInvoiceById(invoiceId);
      setInvoice(fetchedInvoice);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const blob = await invoiceService.downloadInvoicePDF(invoiceId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.invoiceNumber}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download invoice:', err);
      alert('下載發票失敗，請稍後再試');
    }
  };

  const getSuiscanUrl = (txHash: string) => {
    const network = import.meta.env.VITE_SUI_NETWORK || 'testnet';
    return `https://suiscan.xyz/${network}/tx/${txHash}`;
  };

  if (!payment) {
    return null;
  }

  return (
    <div className="payment-result-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Success/Failure Status */}
        <div className="text-center mb-8">
          {success ? (
            <>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 animate-bounce">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
                支付成功！
              </h1>
              <p className="text-cyan-100 text-lg">您的支付已完成，發票已開立</p>
            </>
          ) : (
            <>
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-400 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50 animate-pulse">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
                支付失敗
              </h1>
              <p className="text-cyan-100 text-lg">支付過程中發生錯誤</p>
            </>
          )}
        </div>

        {/* Transaction Info */}
        {success && (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              🔗 交易資訊
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-cyan-500/20">
                <span className="text-cyan-300 font-semibold">訂單編號</span>
                <span className="font-mono font-bold text-white">{payment.orderNumber}</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-purple-500/20">
                <span className="text-purple-300 font-semibold">支付金額</span>
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 text-lg">
                  NT$ {payment.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl border border-pink-500/20">
                <span className="text-pink-300 font-semibold">支付時間</span>
                <span className="text-white">
                  {payment.paidAt
                    ? new Date(payment.paidAt).toLocaleString('zh-TW')
                    : '-'}
                </span>
              </div>
              {payment.transactionHash && (
                <div className="pt-3 border-t border-purple-500/30">
                  <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-cyan-300 font-semibold">⛓️ 區塊鏈交易</span>
                    </div>
                    <p className="font-mono text-xs text-gray-300 mb-3 bg-slate-900/50 p-2 rounded break-all">
                      {payment.transactionHash.slice(0, 20)}...
                      {payment.transactionHash.slice(-20)}
                    </p>
                    <a
                      href={getSuiscanUrl(payment.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all font-semibold text-sm shadow-lg shadow-cyan-500/30"
                    >
                      <span>在 Suiscan 查看</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice */}
        {success && invoice && (
          <div className="mb-6">
            <InvoiceCard
              invoice={invoice}
              onDownload={handleDownloadInvoice}
              showActions={true}
            />
          </div>
        )}

        {success && loadingInvoice && (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-12 mb-6 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
            </div>
            <p className="text-cyan-200 font-semibold">載入發票中...</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link
            to="/payment/history"
            className="block w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-center rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transform hover:scale-[1.02]"
          >
            📋 查看交易記錄
          </Link>

          <Link
            to="/"
            className="block w-full py-4 backdrop-blur-xl bg-white/10 border border-gray-500/30 text-gray-200 text-center rounded-xl hover:bg-white/20 transition-all duration-300 font-bold"
          >
            🏠 返回首頁
          </Link>

          {!success && (
            <button
              onClick={() => navigate('/payment/scan')}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-lg shadow-purple-500/30"
            >
              🔄 重新掃描
            </button>
          )}
        </div>

        {/* Receipt Download Reminder */}
        {success && invoice && (
          <div className="mt-6 backdrop-blur-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-4 text-center">
            <p className="text-sm text-cyan-200 flex items-center justify-center gap-2">
              <span className="text-lg">💡</span>
              <span>您可以隨時在「交易記錄」中查看或下載發票</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResultPage;
