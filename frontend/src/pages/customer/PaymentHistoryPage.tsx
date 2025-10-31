/**
 * 交易記錄頁面 - Web3 風格
 * 顯示旅客的所有支付記錄
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export const PaymentHistoryPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, startDate, endDate]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const result = await paymentService.getCustomerPayments({
        page,
        limit: 10,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      // Ensure we always have an array
      const paymentsArray = result.data || [];
      setPayments(Array.isArray(paymentsArray) ? paymentsArray : []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      // Set empty array on error to prevent undefined access
      setPayments([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="payment-history-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            交易記錄
          </h1>
          <p className="text-cyan-100 text-lg">查看您的所有支付記錄</p>
        </div>

        {/* Filters */}
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            🔍 篩選條件
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-cyan-300 mb-2">
                狀態
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as PaymentStatus | '');
                  setPage(1);
                }}
                className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/50 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all backdrop-blur-sm"
              >
                <option value="">全部狀態</option>
                <option value="COMPLETED">已完成</option>
                <option value="PENDING">處理中</option>
                <option value="FAILED">失敗</option>
                <option value="CANCELLED">已取消</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-semibold text-cyan-300 mb-2">
                開始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/50 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-semibold text-cyan-300 mb-2">
                結束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/50 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all backdrop-blur-sm"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-2 backdrop-blur-xl bg-white/10 border border-gray-500/30 text-gray-200 rounded-xl hover:bg-white/20 transition-all duration-300 font-semibold"
            >
              🔄 重置篩選
            </button>
          </div>
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-12 text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-cyan-500/30"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
            </div>
            <p className="text-cyan-200 font-semibold">載入中...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-gray-500 to-gray-700 rounded-full flex items-center justify-center shadow-xl">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-cyan-200 mb-4 text-lg font-semibold">尚無交易記錄</p>
            <Link
              to="/payment/scan"
              className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg shadow-purple-500/50"
            >
              📱 前往掃碼支付 →
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900/80 to-purple-900/80 border-b border-purple-500/30">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      訂單編號
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      店家
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-white">{payment.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-purple-200">
                          {payment.merchant?.merchantName || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                          NT$ {payment.total.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                            statusColors[payment.status]
                          }`}
                        >
                          {statusIcons[payment.status]} {statusLabels[payment.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-cyan-200">
                          {new Date(payment.createdAt).toLocaleDateString('zh-TW')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          to={`/payment/${payment.id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-bold text-sm transition-colors"
                        >
                          查看詳情 →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-xl shadow-purple-500/20 p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-mono text-sm text-cyan-300">
                        {payment.orderNumber}
                      </p>
                      <p className="font-bold text-white mt-1">
                        {payment.merchant?.merchantName || '-'}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                        statusColors[payment.status]
                      }`}
                    >
                      {statusIcons[payment.status]} {statusLabels[payment.status]}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-3 p-3 bg-slate-900/30 rounded-xl">
                    <span className="text-sm text-purple-300 font-semibold">金額</span>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                      NT$ {payment.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-3 p-3 bg-slate-900/30 rounded-xl">
                    <span className="text-sm text-purple-300 font-semibold">時間</span>
                    <span className="text-sm text-white">
                      {new Date(payment.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>

                  <Link
                    to={`/payment/${payment.id}`}
                    className="block w-full py-3 text-center bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 font-bold shadow-lg shadow-purple-500/30"
                  >
                    查看詳情 →
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-3 backdrop-blur-xl bg-white/10 border border-cyan-500/30 text-cyan-200 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 font-bold"
                >
                  ← 上一頁
                </button>

                <span className="px-6 py-3 backdrop-blur-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 text-white rounded-xl font-bold">
                  第 {page} / {totalPages} 頁
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-6 py-3 backdrop-blur-xl bg-white/10 border border-cyan-500/30 text-cyan-200 rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 font-bold"
                >
                  下一頁 →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryPage;
