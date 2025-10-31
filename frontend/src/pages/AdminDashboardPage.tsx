import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import taxClaimService from '../services/taxClaim.service';
import kycService from '../services/kyc.service';
import rwaPoolService from '../services/rwaPool.service';

interface DashboardStats {
  taxClaims: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    totalAmount: number;
    totalTax: number;
  };
  kyc: {
    total: number;
    pending: number;
    verified: number;
    failed: number;
  };
  rwa: {
    totalPools: number;
    activePools: number;
    totalValue: number;
    totalInvested: number;
    averageFillRate: number;
    averageYield: number;
  };
}

export const AdminDashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError('');

    try {
      const [taxStats, kycStats, rwaStats] = await Promise.all([
        taxClaimService.getStats(),
        kycService.getStats(),
        rwaPoolService.getStats(),
      ]);

      setStats({
        taxClaims: taxStats,
        kyc: kycStats,
        rwa: rwaStats,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <div className="card text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container-responsive py-8">
        <div className="card p-6 bg-red-500/10 border-red-500/50">
          <p className="text-red-400">{error || '載入失敗'}</p>
        </div>
      </div>
    );
  }

  const taxApprovalRate =
    stats.taxClaims.total > 0
      ? ((stats.taxClaims.approved / stats.taxClaims.total) * 100).toFixed(1)
      : '0.0';

  const kycVerificationRate =
    stats.kyc.total > 0 ? ((stats.kyc.verified / stats.kyc.total) * 100).toFixed(1) : '0.0';

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">管理員儀表板</h1>
          <p className="text-gray-400">系統總覽與數據統計</p>
        </div>

        {/* 快捷操作 */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link to="/admin/claims" className="card hover:shadow-glow transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">待審核</div>
                <div className="text-2xl font-bold">{stats.taxClaims.pending}</div>
              </div>
            </div>
          </Link>

          <Link to="/admin/kyc" className="card hover:shadow-glow transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">KYC 待審</div>
                <div className="text-2xl font-bold">{stats.kyc.pending}</div>
              </div>
            </div>
          </Link>

          <Link to="/admin/pools" className="card hover:shadow-glow transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">活躍投資池</div>
                <div className="text-2xl font-bold">{stats.rwa.activePools}</div>
              </div>
            </div>
          </Link>

          <button
            onClick={loadStats}
            className="card hover:shadow-glow transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-400">刷新數據</div>
                <div className="text-sm font-semibold">點擊更新</div>
              </div>
            </div>
          </button>
        </div>

        {/* 退稅統計 */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-6">退稅申請統計</h2>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總申請數</div>
              <div className="text-3xl font-bold">{stats.taxClaims.total}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">已核准</div>
              <div className="text-3xl font-bold text-success">{stats.taxClaims.approved}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">已拒絕</div>
              <div className="text-3xl font-bold text-red-400">{stats.taxClaims.rejected}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">核准率</div>
              <div className="text-3xl font-bold text-primary-400">{taxApprovalRate}%</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總購物金額</div>
              <div className="text-2xl font-bold text-primary-400">
                NT$ {stats.taxClaims.totalAmount.toLocaleString()}
              </div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總退稅金額</div>
              <div className="text-2xl font-bold text-accent-400">
                NT$ {stats.taxClaims.totalTax.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* KYC 統計 */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-6">KYC 驗證統計</h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總申請數</div>
              <div className="text-3xl font-bold">{stats.kyc.total}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">已驗證</div>
              <div className="text-3xl font-bold text-success">{stats.kyc.verified}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">驗證失敗</div>
              <div className="text-3xl font-bold text-red-400">{stats.kyc.failed}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">驗證率</div>
              <div className="text-3xl font-bold text-primary-400">{kycVerificationRate}%</div>
            </div>
          </div>
        </div>

        {/* RWA 投資池統計 */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">RWA 投資池統計</h2>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總投資池數</div>
              <div className="text-3xl font-bold">{stats.rwa.totalPools}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">活躍投資池</div>
              <div className="text-3xl font-bold text-success">{stats.rwa.activePools}</div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">平均填充率</div>
              <div className="text-3xl font-bold text-primary-400">
                {stats.rwa.averageFillRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">總池價值</div>
              <div className="text-2xl font-bold text-primary-400">
                ${stats.rwa.totalValue.toLocaleString()}
              </div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">已投資金額</div>
              <div className="text-2xl font-bold text-accent-400">
                ${stats.rwa.totalInvested.toLocaleString()}
              </div>
            </div>
            <div className="glass p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">平均收益率</div>
              <div className="text-2xl font-bold text-success">
                {(stats.rwa.averageYield * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 系統提示 */}
        <div className="card mt-6 bg-blue-500/10 border-blue-500/50">
          <h3 className="font-semibold mb-2">💡 管理提示</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• 定期檢查待審核的退稅申請和 KYC 驗證</li>
            <li>• 監控投資池的填充率和收益分配</li>
            <li>• 關注異常交易和高風險申請</li>
            <li>• 定期備份系統數據</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
