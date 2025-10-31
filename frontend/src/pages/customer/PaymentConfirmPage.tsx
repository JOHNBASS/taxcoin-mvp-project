/**
 * 支付確認頁面 - Web3 風格
 * 顯示支付詳情並讓旅客確認付款
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';
import PaymentItem from '@/components/payment/PaymentItem';
import { paymentService } from '@/services/payment.service';
import type { Payment, QRCodePaymentData } from '@/types/payment';

export const PaymentConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const wallet = useWallet();

  const [payment, setPayment] = useState<Payment | null>(null);
  const [qrCodeData, setQrCodeData] = useState<QRCodePaymentData | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get payment data from navigation state
    if (location.state?.payment && location.state?.qrCodeData) {
      setPayment(location.state.payment);
      setQrCodeData(location.state.qrCodeData);
    } else {
      // Redirect back if no payment data
      navigate('/payment/scan');
    }
  }, [location, navigate]);

  useEffect(() => {
    // Fetch TaxCoin balance
    const fetchBalance = async () => {
      if (!wallet.account?.address) return;

      try {
        // TODO: Implement balance fetch from backend
        // const balance = await getTaxCoinBalance(wallet.account.address);
        // setBalance(balance);
        setBalance(10000); // Mock balance for now
      } catch (err) {
        console.error('Failed to fetch balance:', err);
      }
    };

    fetchBalance();
  }, [wallet.account?.address]);

  const handleConfirmPayment = async () => {
    if (!payment || !qrCodeData || !wallet.account?.address) {
      setError('缺少必要資訊');
      return;
    }

    // Check balance
    if (balance < payment.total) {
      setError(`TaxCoin 餘額不足。需要 ${payment.total} TWD，目前餘額 ${balance} TWD`);
      return;
    }

    // 檢查 QR Code 中是否有商家錢包地址
    const merchantWalletAddress = (qrCodeData as any).merchantWalletAddress;
    if (!merchantWalletAddress) {
      setError('QR Code 缺少商家錢包地址，請聯繫店家重新生成 QR Code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 獲取用戶的 TaxCoin Coin 對象
      console.log('🔍 獲取 TaxCoin Coin 對象...');
      const coinObjects = await paymentService.getTaxCoinObjects(wallet.account.address);

      if (!coinObjects || coinObjects.length === 0) {
        throw new Error('未找到 TaxCoin，請確保您的錢包中有足夠的 TaxCoin');
      }

      console.log('✅ 找到 TaxCoin Coin 對象:', coinObjects);

      // 2. 構建 TaxCoin 轉帳交易
      const tx = new Transaction();

      // TaxCoin 使用 8 位小數精度
      const amountInSmallestUnit = Math.floor(payment.total * Math.pow(10, 8));

      console.log('💰 轉帳金額:', {
        total: payment.total,
        amountInSmallestUnit,
        merchantWallet: merchantWalletAddress,
      });

      // 從第一個 Coin 對象中分割指定金額
      const [coin] = tx.splitCoins(
        tx.object(coinObjects[0].coinObjectId),
        [tx.pure.u64(amountInSmallestUnit)]
      );

      // 轉帳給商家
      tx.transferObjects(
        [coin],
        tx.pure.address(merchantWalletAddress)
      );

      console.log('📝 交易構建完成，準備簽名...');

      // 3. 簽名並執行交易
      const result = await wallet.signAndExecuteTransaction({
        transaction: tx,
      });

      console.log('✅ 交易已提交:', result);

      if (!result.digest) {
        throw new Error('交易失敗：未獲得交易哈希');
      }

      console.log('🔗 交易哈希:', result.digest);

      // 4. 確認支付（後端更新狀態）
      await paymentService.confirmPayment(payment.id, {
        transactionHash: result.digest,
      });

      console.log('✅ 支付確認成功');

      // 5. 導航到成功頁面
      navigate('/payment/result', {
        state: {
          success: true,
          payment: {
            ...payment,
            transactionHash: result.digest,
            status: 'COMPLETED',
          },
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '支付失敗';
      setError(errorMsg);
      console.error('❌ Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!payment) return;

    try {
      await paymentService.cancelPayment(payment.id);
      navigate('/payment/scan');
    } catch (err) {
      console.error('Failed to cancel payment:', err);
      navigate('/payment/scan');
    }
  };

  if (!payment || !qrCodeData) {
    return null;
  }

  const expiresIn = Math.max(0, Math.floor((qrCodeData.expiresAt - Date.now()) / 1000));
  const minutes = Math.floor(expiresIn / 60);
  const seconds = expiresIn % 60;

  return (
    <div className="payment-confirm-page min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            確認支付
          </h1>
          <p className="text-cyan-100 text-lg">請仔細核對支付資訊</p>
        </div>

        {/* Timer */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-6 text-center shadow-lg shadow-yellow-500/20">
          <p className="text-sm text-yellow-200 font-bold flex items-center justify-center gap-2">
            <span className="text-2xl animate-pulse">⏱️</span>
            <span>此 QR Code 將在 {minutes}:{seconds.toString().padStart(2, '0')} 後過期</span>
          </p>
        </div>

        {/* Merchant Info */}
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            🏪 店家資訊
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-cyan-500/20">
              <span className="text-cyan-300 font-semibold">店家名稱</span>
              <span className="font-bold text-white">{qrCodeData.merchantName}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-xl border border-purple-500/20">
              <span className="text-purple-300 font-semibold">統一編號</span>
              <span className="font-mono text-white">{qrCodeData.merchantTaxId}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="backdrop-blur-xl bg-white/10 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
            🛒 商品明細
          </h2>
          <div className="space-y-3">
            {qrCodeData.items.map((item, index) => (
              <PaymentItem key={index} item={item} editable={false} />
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-500/30 p-6 mb-6">
          <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 mb-4">
            💰 金額摘要
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
              <span className="text-purple-200">小計</span>
              <span className="text-white font-semibold">NT$ {qrCodeData.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-900/30 rounded-xl">
              <span className="text-purple-200">稅額 (5%)</span>
              <span className="text-white font-semibold">NT$ {qrCodeData.tax.toLocaleString()}</span>
            </div>
            <div className="border-t border-purple-500/30 pt-3 flex justify-between p-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl text-lg">
              <span className="font-bold text-cyan-300">總計</span>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 text-xl">
                NT$ {qrCodeData.total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-2xl p-4 mb-6 shadow-lg shadow-cyan-500/30">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-cyan-200 flex items-center gap-2">
              <span className="text-xl">💎</span>
              您的 TaxCoin 餘額
            </span>
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300">
              {balance.toLocaleString()} TWD
            </span>
          </div>
          {balance < payment.total && (
            <p className="text-sm text-red-300 mt-3 bg-red-500/20 p-3 rounded-xl border border-red-500/30 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>餘額不足，無法完成支付</span>
            </p>
          )}
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
                <h3 className="text-sm font-bold text-red-300">錯誤</h3>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleConfirmPayment}
            disabled={loading || balance < payment.total || !wallet.connected}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all duration-300 text-lg font-bold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transform hover:scale-[1.02]"
          >
            {loading ? '⏳ 處理中...' : !wallet.connected ? '🔌 請先連接錢包' : '✓ 確認支付'}
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full py-4 backdrop-blur-xl bg-white/10 border border-gray-500/30 text-gray-200 rounded-xl hover:bg-white/20 disabled:opacity-50 transition-all duration-300 font-bold"
          >
            ✕ 取消
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 text-center backdrop-blur-xl bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4">
          <p className="text-sm text-cyan-200 flex items-center justify-center gap-2">
            <span className="text-lg">📄</span>
            <span>支付完成後將自動開立電子發票</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfirmPage;
