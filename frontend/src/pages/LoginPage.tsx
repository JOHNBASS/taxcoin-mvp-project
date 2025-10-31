import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet, ConnectButton } from '@suiet/wallet-kit';
import { useAuthStore } from '../stores/authStore';
import authService from '../services/auth.service';
import { UserRole } from '../types';

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wallet = useWallet();
  const { login, register, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.TOURIST);
  const [showRoleSelection, setShowRoleSelection] = useState(false);

  // 已登入則跳轉
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // 監聽錢包連接狀態,自動登入
  useEffect(() => {
    const handleWalletLogin = async () => {
      if (!wallet.connected || !wallet.address || isConnecting) return;

      setIsConnecting(true);
      clearError();

      try {
        const address = wallet.address;

        // 1. 獲取 nonce
        const { nonce, message } = await authService.getNonce(address);

        // 2. 簽名訊息
        const messageBytes = new TextEncoder().encode(message);
        const signResult = await wallet.signPersonalMessage({
          message: messageBytes
        });

        console.log('簽名完成:', {
          signature: signResult.signature.substring(0, 50) + '...',
          signatureLength: signResult.signature.length,
        });

        // 3. 前端驗證簽名 (使用 Suiet 提供的驗證方法)
        // 注意: 某些錢包可能不支援 verifySignedPersonalMessage
        if (wallet.verifySignedPersonalMessage) {
          console.log('開始前端驗證簽名...');
          try {
            const verifyResult = await wallet.verifySignedPersonalMessage(signResult);
            console.log('前端驗證結果:', verifyResult);

            if (!verifyResult) {
              console.error('❌ 前端簽名驗證失敗');
              throw new Error('簽名驗證失敗,請重試');
            }
            console.log('✓ 前端簽名驗證成功!');
          } catch (verifyError) {
            console.error('前端驗證過程出錯:', verifyError);
            // 某些錢包可能不支援驗證,繼續流程並由後端驗證
            console.warn('⚠️  前端驗證失敗,將由後端進行驗證');
          }
        } else {
          console.log('此錢包不支援前端驗證,將由後端進行驗證');
        }

        // 提取簽名和公鑰
        const signature = signResult.signature;

        // Suiet 錢包的簽名已包含公鑰 (97 bytes: flag + signature + publicKey)
        // 我們將簽名作為公鑰發送,後端會從簽名中提取
        const publicKey = signature;

        // 3. 嘗試登入
        try {
          await login(address, signature, publicKey, message, nonce);
          // 登入成功會自動跳轉
        } catch (loginError) {
          // 檢查是否為新用戶
          const errorMsg = loginError instanceof Error ? loginError.message : '';
          if (
            errorMsg.includes('使用者不存在') ||
            errorMsg.includes('請先註冊') ||
            errorMsg.includes('資源不存在')
          ) {
            console.log('New user detected, showing role selection');
            setShowRoleSelection(true);
            clearError();
          } else {
            console.error('Login failed:', loginError);
          }
        }
      } catch (error) {
        console.error('Wallet login failed:', error);
      } finally {
        setIsConnecting(false);
      }
    };

    handleWalletLogin();
  }, [wallet.connected, wallet.address]);

  /**
   * 註冊新使用者
   */
  const handleRegister = async () => {
    if (!wallet.address) return;

    try {
      await register(wallet.address, selectedRole);

      // 根據角色跳轉到不同頁面
      if (selectedRole === UserRole.MERCHANT) {
        // 店家需要先填寫店家資料
        navigate('/merchant/register');
      } else {
        // 旅客和投資者直接進入首頁
        navigate('/');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 背景 */}
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      {/* 登入卡片 */}
      <div className="card max-w-md w-full relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-cyber shadow-glow-lg mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-glow mb-2">TAXCOIN</h1>
          <p className="text-gray-400">{t('home.subtitle')}</p>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 角色選擇 (新使用者) */}
        {showRoleSelection ? (
          <div className="space-y-6">
            <div>
              <p className="text-center text-gray-400 mb-4">
                {t('auth.selectRole')}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setSelectedRole(UserRole.TOURIST)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedRole === UserRole.TOURIST
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✈️</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{t('auth.tourist')}</h3>
                      <p className="text-sm text-gray-400">{t('auth.touristDesc')}</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole(UserRole.MERCHANT)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedRole === UserRole.MERCHANT
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏪</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">店家</h3>
                      <p className="text-sm text-gray-400">收款、商品管理、發票管理</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole(UserRole.INVESTOR)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedRole === UserRole.INVESTOR
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div className="text-left">
                      <h3 className="font-semibold text-white">{t('auth.investor')}</h3>
                      <p className="text-sm text-gray-400">{t('auth.investorDesc')}</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? t('auth.registering') : t('auth.completeRegistration')}
            </button>

            <button
              onClick={() => {
                setShowRoleSelection(false);
                wallet.disconnect();
              }}
              className="btn btn-secondary w-full"
            >
              {t('common.back')}
            </button>
          </div>
        ) : (
          /* 錢包連接 */
          <div className="space-y-6">
            {isConnecting || isLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-gray-400">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('common.processing')}
              </div>
            ) : (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}

            <div className="text-center text-sm text-gray-500">
              <p>{t('auth.walletSupport')}</p>
              <p className="mt-1">{t('auth.walletExamples')}</p>
            </div>
          </div>
        )}

        {/* 功能說明 */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-primary-400 font-semibold mb-1">{t('auth.step1')}</div>
              <div className="text-xs text-gray-500">{t('auth.connectWallet')}</div>
            </div>
            <div>
              <div className="text-primary-400 font-semibold mb-1">{t('auth.step2')}</div>
              <div className="text-xs text-gray-500">{t('auth.signVerify')}</div>
            </div>
            <div>
              <div className="text-primary-400 font-semibold mb-1">{t('auth.step3')}</div>
              <div className="text-xs text-gray-500">{t('auth.startUsing')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 背景裝飾 */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
    </div>
  );
};
