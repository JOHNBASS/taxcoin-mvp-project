import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

interface PrivateRouteProps {
  allowedRoles?: UserRole[];
}

/**
 * 私有路由保護組件
 * 需要登入才能訪問,可選擇性限制角色
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  // 未登入,重定向到登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 檢查角色權限
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
