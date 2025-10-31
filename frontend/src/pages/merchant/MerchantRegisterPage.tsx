/**
 * 店家註冊頁面 - Web3 風格
 * 使用賽博龐克視覺設計
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@suiet/wallet-kit';
import { merchantService } from '@/services/merchant.service';
import type { CreateMerchantDto } from '@/types/payment';

export const MerchantRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const wallet = useWallet();

  const [formData, setFormData] = useState<CreateMerchantDto>({
    merchantName: '',
    taxId: '',
    ownerName: '',
    phone: '',
    address: '',
    businessType: '',
    walletAddress: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // 自動填入錢包地址
  useEffect(() => {
    if (wallet.account?.address) {
      setFormData((prev) => ({
        ...prev,
        walletAddress: wallet.account!.address,
      }));
    }
  }, [wallet.account]);

  /**
   * 台灣統一編號驗證算法
   */
  const validateTaxId = (taxId: string): boolean => {
    if (!/^\d{8}$/.test(taxId)) return false;

    const weights = [1, 2, 1, 2, 1, 2, 4, 1];
    let sum = 0;

    for (let i = 0; i < 8; i++) {
      let product = parseInt(taxId[i]) * weights[i];
      sum += Math.floor(product / 10) + (product % 10);
    }

    return sum % 10 === 0 || (sum % 10 === 9 && taxId[6] === '7');
  };

  /**
   * 表單驗證
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.merchantName.trim()) {
      newErrors.merchantName = '請輸入店家名稱';
    }

    if (!formData.taxId.trim()) {
      newErrors.taxId = '請輸入統一編號';
    } else if (!validateTaxId(formData.taxId)) {
      newErrors.taxId = '統一編號格式錯誤';
    }

    if (!formData.ownerName.trim()) {
      newErrors.ownerName = '請輸入負責人姓名';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '請輸入聯絡電話';
    }

    if (!formData.address.trim()) {
      newErrors.address = '請輸入營業地址';
    }

    if (!formData.businessType) {
      newErrors.businessType = '請選擇營業類型';
    }

    if (!formData.walletAddress) {
      newErrors.walletAddress = '請連接錢包';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 提交表單
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      await merchantService.createMerchant(formData);
      alert('店家註冊成功！');
      navigate('/merchant/products');
    } catch (err) {
      alert(err instanceof Error ? err.message : '註冊失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    if (!wallet.connected) {
      try {
        // @ts-ignore - wallet.connect() exists but may not be in types
        await wallet.connect?.();
      } catch (err) {
        console.error('Failed to connect wallet:', err);
        alert('連接錢包失敗');
      }
    }
  };

  // Update wallet address when wallet connects
  React.useEffect(() => {
    if (wallet.account?.address) {
      setFormData((prev) => ({
        ...prev,
        walletAddress: wallet.account!.address,
      }));
    }
  }, [wallet.account]);

  const businessTypes = [
    '餐飲業',
    '零售業',
    '服務業',
    '批發業',
    '製造業',
    '文創產業',
    '觀光旅遊',
    '其他',
  ];

  return (
    <div className="min-h-screen py-12 px-4 relative overflow-hidden">
      {/* Web3 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 漸變光暈 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />

        {/* 網格背景 */}
        <div className="grid-bg opacity-10" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* 頭部 - Web3 風格 */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-cyber shadow-glow-lg mb-6 animate-float">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 via-accent-400 to-green-400 bg-clip-text text-transparent animate-text-shimmer">
            店家註冊
          </h1>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            加入 <span className="text-primary-400 font-semibold">TaxCoin</span> 生態系統，開啟
            <span className="text-accent-400 font-semibold"> Web3 支付</span>新紀元
          </p>

          {/* 狀態指示器 */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wallet.connected ? 'bg-green-400 shadow-glow-sm' : 'bg-gray-600'} animate-pulse`} />
              <span className="text-sm text-gray-400">{wallet.connected ? '錢包已連接' : '錢包未連接'}</span>
            </div>
            <div className="text-gray-700">|</div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span className="text-sm text-gray-400">安全加密</span>
            </div>
          </div>
        </div>

        {/* 表單 - 賽博龐克卡片 */}
        <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 hover:border-primary-500/50 shadow-glow transition-all duration-300 animate-slide-up">
          {/* 卡片頂部裝飾 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-green-500" />

          <form onSubmit={handleSubmit} className="space-y-6 p-8">
            {/* 錢包連接區塊 */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-cyber flex items-center justify-center shadow-glow">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-primary-400 mb-1">
                      錢包地址
                    </label>
                    {wallet.connected && formData.walletAddress ? (
                      <p className="font-mono text-sm text-gray-300">
                        {formData.walletAddress.slice(0, 8)}...{formData.walletAddress.slice(-6)}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">未連接</p>
                    )}
                  </div>
                </div>

                {!wallet.connected && (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    className="btn btn-primary btn-sm"
                  >
                    🔗 連接錢包
                  </button>
                )}
              </div>
              {errors.walletAddress && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.walletAddress}
                </p>
              )}
            </div>

            {/* 表單分組 */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 店家名稱 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  店家名稱 <span className="text-accent-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.merchantName}
                    onChange={(e) =>
                      setFormData({ ...formData, merchantName: e.target.value })
                    }
                    className={`input ${
                      errors.merchantName ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    placeholder="例如: 星際咖啡廳"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                {errors.merchantName && (
                  <p className="text-red-400 text-sm mt-1">{errors.merchantName}</p>
                )}
              </div>

              {/* 統一編號 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  統一編號 <span className="text-accent-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  maxLength={8}
                  className={`input font-mono ${
                    errors.taxId ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="12345678"
                />
                {errors.taxId && (
                  <p className="text-red-400 text-sm mt-1">{errors.taxId}</p>
                )}
              </div>

              {/* 負責人姓名 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  負責人姓名 <span className="text-accent-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) =>
                    setFormData({ ...formData, ownerName: e.target.value })
                  }
                  className={`input ${
                    errors.ownerName ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="王小明"
                />
                {errors.ownerName && (
                  <p className="text-red-400 text-sm mt-1">{errors.ownerName}</p>
                )}
              </div>

              {/* 聯絡電話 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  聯絡電話 <span className="text-accent-400">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`input ${
                    errors.phone ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="0912-345-678"
                />
                {errors.phone && (
                  <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* 營業類型 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  營業類型 <span className="text-accent-400">*</span>
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) =>
                    setFormData({ ...formData, businessType: e.target.value })
                  }
                  className={`input ${
                    errors.businessType ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                >
                  <option value="">請選擇營業類型</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.businessType && (
                  <p className="text-red-400 text-sm mt-1">{errors.businessType}</p>
                )}
              </div>

              {/* 營業地址 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  營業地址 <span className="text-accent-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className={`input ${
                    errors.address ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  placeholder="台北市信義區信義路五段7號"
                />
                {errors.address && (
                  <p className="text-red-400 text-sm mt-1">{errors.address}</p>
                )}
              </div>
            </div>

            {/* 提交按鈕 */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn btn-secondary flex-1"
                disabled={loading}
              >
                取消
              </button>

              <button
                type="submit"
                disabled={loading || !wallet.connected}
                className="btn btn-primary flex-1 relative overflow-hidden group"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    註冊中...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    開始註冊
                  </span>
                )}
              </button>
            </div>

            {/* 提示訊息 */}
            <div className="p-4 rounded-lg bg-primary-500/10 border border-primary-500/30">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-300 space-y-1">
                  <p className="font-semibold text-primary-400">註冊須知：</p>
                  <ul className="space-y-1 text-gray-400">
                    <li>• 請確保統一編號正確，註冊後無法修改</li>
                    <li>• 錢包地址將作為收款帳戶，請妥善保管</li>
                    <li>• 所有交易記錄將上鏈，完全透明且不可竄改</li>
                  </ul>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 底部裝飾 */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by TaxCoin • Built on Sui Blockchain</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Network: Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
};
