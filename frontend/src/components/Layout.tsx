import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { formatAddress } from '../utils/wallet';
import { UserRole } from '../types';
import { LanguageSwitcher } from './LanguageSwitcher';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * 應用主布局 - 使用底部導航欄進行 RWD
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 檢查當前路徑是否匹配
  const isActive = (path: string) => location.pathname === path;

  // 根據角色獲取導航項目
  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case UserRole.TOURIST:
        return [
          { path: '/tax-claims', icon: '🧾', label: t('navigation.taxClaims') },
          { path: '/payment/scan', icon: '📱', label: '掃碼支付' },
          { path: '/payment/history', icon: '📋', label: '交易記錄' },
          { path: '/kyc', icon: '✅', label: t('navigation.kyc') },
        ];
      case UserRole.INVESTOR:
        return [
          { path: '/exchange', icon: '🔄', label: t('navigation.exchange') },
          { path: '/pools', icon: '💰', label: t('navigation.pools') },
          { path: '/my-investments', icon: '📊', label: t('navigation.myInvestments') },
        ];
      case UserRole.MERCHANT:
        return [
          { path: '/merchant/products', icon: '📦', label: '商品管理' },
          { path: '/merchant/qrcode', icon: '🔲', label: '生成 QR Code' },
        ];
      case UserRole.ADMIN:
        return [
          { path: '/admin/dashboard', icon: '📈', label: t('navigation.dashboard') },
          { path: '/admin/claims', icon: '📋', label: t('navigation.claims') },
          { path: '/admin/kyc', icon: '👤', label: t('navigation.kyc') },
          { path: '/admin/pools', icon: '🏦', label: t('navigation.pools') },
          { path: '/admin/users', icon: '👥', label: t('navigation.users') },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      {/* 頂部導航欄 */}
      <nav className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="container-responsive py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-cyber shadow-glow flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
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
              <span className="text-xl font-bold text-glow">TAXCOIN</span>
            </Link>

            {/* 桌面版導航連結 */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-6">
                {/* 導航連結 */}
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-link ${isActive(item.path) ? 'text-primary-400' : ''}`}
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}

                {/* 使用者資訊 */}
                <div className="flex items-center gap-4 ml-4">
                  {user?.walletAddress && (
                    <div className="glass px-3 py-2 rounded-lg">
                      <span className="text-sm text-primary-400 font-mono">
                        {formatAddress(user.walletAddress)}
                      </span>
                    </div>
                  )}

                  <LanguageSwitcher />

                  <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            )}

            {/* 桌面版：未登入時也顯示語言切換 */}
            {!isAuthenticated && (
              <div className="hidden md:flex">
                <LanguageSwitcher />
              </div>
            )}

            {/* 移動版：顯示語言切換和錢包地址 */}
            {isAuthenticated && user?.walletAddress && (
              <div className="md:hidden flex items-center gap-2">
                <LanguageSwitcher />
                <div className="glass px-3 py-2 rounded-lg">
                  <span className="text-xs text-primary-400 font-mono">
                    {formatAddress(user.walletAddress)}
                  </span>
                </div>
              </div>
            )}

            {/* 移動版：未登入時也顯示語言切換 */}
            {!isAuthenticated && (
              <div className="md:hidden">
                <LanguageSwitcher />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="flex-1">
        {children}
      </main>

      {/* 移動版底部導航欄 */}
      {isAuthenticated && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-gray-800 z-50" style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-primary-400 bg-primary-500/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-xs font-medium">{t('common.logout')}</span>
            </button>
          </div>
        </nav>
      )}

      {/* 背景裝飾 */}
      <div className="fixed inset-0 grid-bg opacity-10 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
    </div>
  );
};
