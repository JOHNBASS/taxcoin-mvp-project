/**
 * 掃碼支付頁面
 * 旅客使用此頁面掃描店家的支付 QR Code
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCodeScanner from '@/components/payment/QRCodeScanner';
import { paymentService } from '@/services/payment.service';
import type { QRCodePaymentData } from '@/types/payment';

export const ScanPaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle QR Code scan
  const handleScan = async (decodedText: string) => {
    setLoading(true);
    setError(null);

    try {
      // Parse QR Code data
      const qrData: QRCodePaymentData = JSON.parse(decodedText);

      // Validate QR Code
      if (qrData.type !== 'taxcoin_payment' || qrData.version !== '1.0') {
        throw new Error('無效的 QR Code 格式');
      }

      // Check if expired
      if (Date.now() > qrData.expiresAt) {
        throw new Error('QR Code 已過期，請要求店家重新生成');
      }

      // Send to backend for verification
      const result = await paymentService.scanQRCode({ qrCodeData: decodedText });

      // Navigate to confirmation page
      navigate('/payment/confirm', {
        state: {
          payment: result.payment,
          qrCodeData: result.qrCodeData,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '無法處理 QR Code';
      setError(errorMsg);
      console.error('QR Code scan error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle manual code input
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    await handleScan(manualCode);
  };

  return (
    <div className="scan-payment-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            掃碼支付
          </h1>
          <p className="text-cyan-100 text-lg">請掃描店家提供的支付 QR Code</p>
        </div>

        {/* QR Code Scanner */}
        {!isScanning ? (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-8 mb-6">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-pulse">
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
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
              </div>

              <button
                onClick={() => setIsScanning(true)}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 text-lg font-bold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transform hover:scale-105"
              >
                🔍 開始掃描 QR Code
              </button>

              <p className="text-sm text-cyan-300 mt-4 font-medium">
                點擊按鈕後將啟用相機進行掃描
              </p>
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
            <QRCodeScanner onScan={handleScan} onError={setError} />

            <div className="mt-4 text-center">
              <button
                onClick={() => setIsScanning(false)}
                className="text-cyan-300 hover:text-cyan-100 underline font-semibold transition-colors"
              >
                取消掃描
              </button>
            </div>
          </div>
        )}

        {/* Manual Input */}
        <div className="backdrop-blur-xl bg-white/10 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            ⌨️ 手動輸入支付碼
          </h2>

          <form onSubmit={handleManualSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-cyan-300 mb-2">
                支付碼
              </label>
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="貼上店家提供的支付碼..."
                className="w-full px-4 py-3 bg-slate-900/50 border border-purple-500/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all backdrop-blur-sm"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim() || loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:scale-[1.02]"
            >
              {loading ? '⏳ 處理中...' : '✓ 確認'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-6 shadow-lg shadow-red-500/20">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-red-300">⚠️ 掃描錯誤</h3>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 shadow-xl shadow-cyan-500/10">
          <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-3">
            📋 使用說明
          </h3>
          <ul className="space-y-3 text-sm text-cyan-100">
            <li className="flex items-start group">
              <span className="mr-3 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-white">1</span>
              <span className="group-hover:text-white transition-colors">向店家索取支付 QR Code</span>
            </li>
            <li className="flex items-start group">
              <span className="mr-3 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-white">2</span>
              <span className="group-hover:text-white transition-colors">點擊「開始掃描」按鈕並允許相機權限</span>
            </li>
            <li className="flex items-start group">
              <span className="mr-3 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-white">3</span>
              <span className="group-hover:text-white transition-colors">將 QR Code 對準掃描框</span>
            </li>
            <li className="flex items-start group">
              <span className="mr-3 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-bold text-white">4</span>
              <span className="group-hover:text-white transition-colors">確認支付資訊並完成付款</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScanPaymentPage;
