import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from '@suiet/wallet-kit';
import '@suiet/wallet-kit/style.css';
import { useAuthStore } from './stores/authStore';
import './i18n/config'; // Initialize i18n
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { TaxClaimListPage } from './pages/TaxClaimListPage';
import { TaxClaimDetailPage } from './pages/TaxClaimDetailPage';
import { TaxClaimNewPage } from './pages/TaxClaimNewPage';
import { KycPage } from './pages/KycPage';
import { PoolListPage } from './pages/PoolListPage';
import { PoolDetailPage } from './pages/PoolDetailPage';
import { MyInvestmentsPage } from './pages/MyInvestmentsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminClaimsPage } from './pages/AdminClaimsPage';
import { AdminKycPage } from './pages/AdminKycPage';
import { AdminPoolsPage } from './pages/AdminPoolsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ExchangeFullPage } from './pages/ExchangeFullPage';
import { UserRole } from './types';

// QR Code 支付 - 旅客端頁面
import { ScanPaymentPage } from './pages/customer/ScanPaymentPage';
import { PaymentConfirmPage } from './pages/customer/PaymentConfirmPage';
import { PaymentResultPage } from './pages/customer/PaymentResultPage';
import { PaymentHistoryPage } from './pages/customer/PaymentHistoryPage';
import { PaymentDetailPage } from './pages/customer/PaymentDetailPage';

// QR Code 支付 - 店家端頁面
import { MerchantRegisterPage } from './pages/merchant/MerchantRegisterPage';
import { ProductManagementPage } from './pages/merchant/ProductManagementPage';
import { QRCodeGeneratorPage } from './pages/merchant/QRCodeGeneratorPage';

// Loading 組件 (未使用,保留以備將來使用)
// const PageLoading = () => (
//   <div className="min-h-screen flex items-center justify-center">
//     <div className="text-center">
//       <div className="inline-block w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
//       <p className="mt-4 text-gray-400">載入中...</p>
//     </div>
//   </div>
// );

// 未授權頁面
const UnauthorizedPage = () => (
  <Layout>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center space-y-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold">無權限訪問</h1>
        <p className="text-gray-400">您沒有權限訪問此頁面</p>
        <a href="/" className="btn btn-primary">返回首頁</a>
      </div>
    </div>
  </Layout>
);

// 404 頁面
const NotFoundPage = () => (
  <Layout>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md text-center space-y-4">
        <div className="text-6xl">404</div>
        <h1 className="text-2xl font-bold">頁面不存在</h1>
        <p className="text-gray-400">您訪問的頁面不存在</p>
        <a href="/" className="btn btn-primary">返回首頁</a>
      </div>
    </div>
  </Layout>
);

// 佔位頁面 (未使用,保留以備將來使用)
// const ComingSoonPage = ({ title }: { title: string }) => (
//   <div className="container-responsive py-12">
//     <div className="card max-w-2xl mx-auto text-center space-y-6">
//       <div className="text-6xl">🚧</div>
//       <h1 className="text-3xl font-bold">{title}</h1>
//       <p className="text-gray-400">此功能開發中,敬請期待</p>
//       <a href="/" className="btn btn-primary">返回首頁</a>
//     </div>
//   </div>
// );

function App() {
  const { initializeAuth } = useAuthStore();

  // 初始化認證狀態
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
        {/* 公開路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* 需要登入的路由 */}
        <Route element={<PrivateRoute />}>
          <Route path="/" element={<Layout><HomePage /></Layout>} />

          {/* 旅客路由 */}
          <Route element={<PrivateRoute allowedRoles={[UserRole.TOURIST, UserRole.ADMIN]} />}>
            <Route path="/tax-claims" element={<Layout><TaxClaimListPage /></Layout>} />
            <Route path="/tax-claims/:id" element={<Layout><TaxClaimDetailPage /></Layout>} />
            <Route path="/tax-claims/new" element={<Layout><TaxClaimNewPage /></Layout>} />
            <Route path="/kyc" element={<Layout><KycPage /></Layout>} />

            {/* QR Code 支付 - 旅客端 */}
            <Route path="/payment/scan" element={<Layout><ScanPaymentPage /></Layout>} />
            <Route path="/payment/confirm" element={<Layout><PaymentConfirmPage /></Layout>} />
            <Route path="/payment/result" element={<Layout><PaymentResultPage /></Layout>} />
            <Route path="/payment/history" element={<Layout><PaymentHistoryPage /></Layout>} />
            <Route path="/payment/:id" element={<Layout><PaymentDetailPage /></Layout>} />
          </Route>

          {/* 投資者路由 */}
          <Route element={<PrivateRoute allowedRoles={[UserRole.INVESTOR, UserRole.ADMIN]} />}>
            <Route path="/pools" element={<Layout><PoolListPage /></Layout>} />
            <Route path="/pools/:id" element={<Layout><PoolDetailPage /></Layout>} />
            <Route path="/my-investments" element={<Layout><MyInvestmentsPage /></Layout>} />
            <Route path="/exchange" element={<Layout><ExchangeFullPage /></Layout>} />
          </Route>

          {/* 店家路由 */}
          <Route element={<PrivateRoute allowedRoles={[UserRole.MERCHANT, UserRole.ADMIN]} />}>
            {/* 商品管理 */}
            <Route path="/merchant/products" element={<Layout><ProductManagementPage /></Layout>} />

            {/* QR Code 生成 */}
            <Route path="/merchant/qrcode" element={<Layout><QRCodeGeneratorPage /></Layout>} />
          </Route>

          {/* 店家註冊 - 允許所有登入用戶訪問 */}
          <Route path="/merchant/register" element={<Layout><MerchantRegisterPage /></Layout>} />

          {/* 管理員路由 */}
          <Route element={<PrivateRoute allowedRoles={[UserRole.ADMIN]} />}>
            <Route path="/admin" element={<Layout><AdminDashboardPage /></Layout>} />
            <Route path="/admin/dashboard" element={<Layout><AdminDashboardPage /></Layout>} />
            <Route path="/admin/claims" element={<Layout><AdminClaimsPage /></Layout>} />
            <Route path="/admin/kyc" element={<Layout><AdminKycPage /></Layout>} />
            <Route path="/admin/pools" element={<Layout><AdminPoolsPage /></Layout>} />
            <Route path="/admin/users" element={<Layout><AdminUsersPage /></Layout>} />
            <Route path="/mvp" element={<Layout><AdminUsersPage /></Layout>} />
          </Route>
        </Route>

        {/* 404 路由 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    </WalletProvider>
  );
}

export default App;
