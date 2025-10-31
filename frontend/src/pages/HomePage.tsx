import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';

export const HomePage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="container-responsive relative z-10">
        <div className="card max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          {/* Logo 區域 */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-cyber shadow-glow-lg">
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

            <h1 className="text-5xl md:text-6xl font-bold text-glow">
              TAXCOIN
            </h1>

            <p className="text-xl md:text-2xl text-gray-400">
              {t('home.subtitle')}
            </p>
          </div>

          {/* 使用者問候 */}
          {isAuthenticated && user && (
            <div className="glass p-6 rounded-lg">
              <p className="text-lg text-gray-300 mb-4">
                {t('common.welcomeBack')}, <span className="text-primary-400 font-semibold">{user.role}</span>
              </p>

              {/* ✅ 新增: 顯示用戶的 W3C DID */}
              {user.did && (
                <div className="glass p-4 rounded-lg mb-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-lg">🔑</span>
                    </div>
                    <span className="text-sm text-gray-400">{t('credential.did')}</span>
                  </div>
                  <p className="text-xs font-mono text-purple-300 break-all ml-11">
                    {user.did}
                  </p>
                  {user.did.startsWith('did:key:') && (
                    <span className="inline-block mt-2 ml-11 px-2 py-1 text-xs bg-success/20 text-success rounded">
                      ✓ {t('credential.w3cStandard')}
                    </span>
                  )}
                </div>
              )}

              {/* 根據角色顯示快捷入口 */}
              <div className="flex flex-wrap justify-center gap-4">
                {user.role === UserRole.TOURIST && (
                  <>
                    <Link to="/tax-claims/new" className="btn btn-primary">
                      🧾 {t('home.applyTaxRefund')}
                    </Link>
                    <Link to="/payment/scan" className="btn btn-accent">
                      📱 掃碼支付
                    </Link>
                    <Link to="/payment/history" className="btn btn-primary">
                      📋 交易記錄
                    </Link>
                    <Link to="/kyc" className="btn btn-secondary">
                      ✅ {t('home.kycVerification')}
                    </Link>
                  </>
                )}

                {user.role === UserRole.INVESTOR && (
                  <>
                    <Link to="/pools" className="btn btn-primary">
                      💰 {t('home.browsePools')}
                    </Link>
                    <Link to="/my-investments" className="btn btn-secondary">
                      📊 {t('home.myInvestments')}
                    </Link>
                  </>
                )}

                {user.role === UserRole.MERCHANT && (
                  <>
                    <Link to="/merchant/register" className="btn btn-accent">
                      ✨ 店家註冊
                    </Link>
                    <Link to="/merchant/products" className="btn btn-primary">
                      📦 商品管理
                    </Link>
                    <Link to="/merchant/qrcode" className="btn btn-secondary">
                      🔲 生成 QR Code
                    </Link>
                  </>
                )}

                {user.role === UserRole.ADMIN && (
                  <>
                    <Link to="/admin/dashboard" className="btn btn-primary">
                      📈 {t('home.adminDashboard')}
                    </Link>
                    <Link to="/admin/claims" className="btn btn-secondary">
                      📋 {t('home.reviewClaims')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 功能介紹 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="glass rounded-lg p-6 space-y-3 hover:shadow-glow transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-primary-400">{t('home.feature1Title')}</h3>
              <p className="text-gray-400">
                {t('home.feature1Desc')}
              </p>
            </div>

            <div className="glass rounded-lg p-6 space-y-3 hover:shadow-glow transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-accent-400">{t('home.feature2Title')}</h3>
              <p className="text-gray-400">
                {t('home.feature2Desc')}
              </p>
            </div>

            <div className="glass rounded-lg p-6 space-y-3 hover:shadow-glow transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-success">{t('home.feature3Title')}</h3>
              <p className="text-gray-400">
                {t('home.feature3Desc')}
              </p>
            </div>
          </div>

          {/* CTA 按鈕 */}
          {!isAuthenticated && (
            <div className="pt-6">
              <Link to="/login" className="btn btn-primary btn-lg">
                🔐 {t('home.getStarted')}
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                {t('home.loginPrompt')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
