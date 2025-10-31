import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import rwaPoolService from '../services/rwaPool.service';
import type { RwaPool, PoolStatus, RiskLevel } from '../types';

const statusConfig: Record<PoolStatus, { label: string; color: string; bgColor: string }> = {
  RECRUITING: { label: '募資中', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  FULL: { label: '已滿額', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  MATURED: { label: '已到期', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  SETTLED: { label: '已結算', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  REDEEMED: { label: '已兌現', color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
};

const riskConfig: Record<RiskLevel, { label: string; color: string }> = {
  LOW: { label: '低風險', color: 'text-green-400' },
  MEDIUM: { label: '中風險', color: 'text-yellow-400' },
  HIGH: { label: '高風險', color: 'text-red-400' },
};

export const PoolListPage = () => {
  const [pools, setPools] = useState<RwaPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    loadPools();
  }, [page, selectedStatus]);

  const loadPools = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await rwaPoolService.getPools({
        page,
        limit: 9,
        status: selectedStatus || undefined,
      });

      setPools(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 計算填充率
   */
  const calculateFillRate = (pool: RwaPool): number => {
    const invested = pool.totalShares - pool.availableShares;
    return (invested / pool.totalShares) * 100;
  };

  /**
   * 計算剩餘天數
   */
  const getDaysRemaining = (maturityDate: string): number => {
    const now = new Date();
    const maturity = new Date(maturityDate);
    const diff = maturity.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  /**
   * 格式化日期 (未使用,保留以備將來使用)
   */
  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('zh-TW', {
  //     year: 'numeric',
  //     month: '2-digit',
  //     day: '2-digit',
  //   });
  // };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">RWA 投資池</h1>
          <p className="text-gray-400">參與退稅債權投資,獲得穩定收益</p>
        </div>

        {/* 範例說明區塊 */}
        <div className="card mb-8 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/30">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💡</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-3 text-primary-300">投資池範例說明</h2>
              <div className="bg-dark-800/50 rounded-lg p-4 mb-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-accent-400 mb-3">台北旅遊退稅池 #1</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">目標募集:</span>
                        <span className="font-semibold">50,000 TaxCoin</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">年化收益:</span>
                        <span className="font-semibold text-accent-400">2.0%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">投資期限:</span>
                        <span className="font-semibold">7 天</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">風險等級:</span>
                        <span className="font-semibold text-green-400">LOW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">包含債權:</span>
                        <span className="font-semibold">100 筆退稅申請</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-400 mb-3">收益試算</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">投資金額:</span>
                        <span className="font-semibold">10,000 TaxCoin</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">年化收益:</span>
                        <span className="text-gray-400">10,000 × 2% = 200 TaxCoin/年</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">7天收益:</span>
                        <span className="text-gray-400">200 × (7/365) = 3.84</span>
                      </div>
                      <div className="h-px bg-gray-600 my-2"></div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-primary-300">到期總額:</span>
                        <span className="font-bold text-lg text-primary-400">10,003.84 TaxCoin</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">實質報酬率:</span>
                        <span className="text-accent-400">+0.0384% (7天)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-accent-400 font-bold">→</span>
                <p>
                  每個投資池將多筆退稅債權集合成資產包,由政府擔保,到期自動結算。投資人可獲得固定收益,
                  同時為遊客提供即時退稅服務,創造三贏局面。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 篩選器 */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedStatus('')}
              className={`btn btn-sm ${selectedStatus === '' ? 'btn-primary' : 'btn-secondary'}`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedStatus('RECRUITING')}
              className={`btn btn-sm ${selectedStatus === 'RECRUITING' ? 'btn-primary' : 'btn-secondary'}`}
            >
              募資中
            </button>
            <button
              onClick={() => setSelectedStatus('FULL')}
              className={`btn btn-sm ${selectedStatus === 'FULL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              已滿額
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="card text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">載入中...</p>
          </div>
        )}

        {/* 錯誤 */}
        {error && !isLoading && (
          <div className="card p-6 bg-red-500/10 border-red-500/50">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && !error && pools.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">暫無投資池</h3>
            <p className="text-gray-400">目前沒有可投資的池,請稍後再來</p>
          </div>
        )}

        {/* 投資池卡片網格 */}
        {!isLoading && !error && pools.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((pool) => {
              const fillRate = calculateFillRate(pool);
              const daysRemaining = getDaysRemaining(pool.maturityDate);

              return (
                <Link
                  key={pool.id}
                  to={`/pools/${pool.id}`}
                  className="card hover:shadow-glow transition-all group"
                >
                  {/* 標題和狀態 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary-400 transition-colors">
                        {pool.name}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{pool.description}</p>
                    </div>
                  </div>

                  {/* 狀態標籤 */}
                  <div className="flex gap-2 mb-4">
                    <span
                      className={`
                        px-3 py-1 rounded-full text-xs font-semibold
                        ${statusConfig[pool.status].color}
                        ${statusConfig[pool.status].bgColor}
                      `}
                    >
                      {statusConfig[pool.status].label}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${riskConfig[pool.riskLevel].color} bg-gray-800`}>
                      {riskConfig[pool.riskLevel].label}
                    </span>
                  </div>

                  {/* 關鍵指標 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="glass p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">年化收益率</div>
                      <div className="text-2xl font-bold text-accent-400">
                        {(pool.yieldRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="glass p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">總價值</div>
                      <div className="text-lg font-bold text-primary-400">
                        ${pool.totalValue.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 填充率進度條 */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">填充率</span>
                      <span className="font-semibold">{fillRate.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                        style={{ width: `${fillRate}%` }}
                      />
                    </div>
                  </div>

                  {/* 底部資訊 */}
                  <div className="grid grid-cols-3 gap-3 text-center text-sm pt-4 border-t border-gray-800">
                    <div>
                      <div className="text-gray-400 text-xs">投資者</div>
                      <div className="font-semibold">{pool.investorCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">剩餘天數</div>
                      <div className="font-semibold">{daysRemaining} 天</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">單價</div>
                      <div className="font-semibold">${pool.sharePrice}</div>
                    </div>
                  </div>

                  {/* Hover 提示 */}
                  <div className="mt-4 text-center text-sm text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    點擊查看詳情 →
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 分頁 */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
            >
              上一頁
            </button>

            <div className="flex gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary btn-sm"
            >
              下一頁
            </button>
          </div>
        )}

        {/* 投資須知 */}
        <div className="card mt-8 bg-blue-500/10 border-blue-500/50">
          <h3 className="font-semibold mb-3">💡 投資須知</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• RWA Pool 投資期為 5-7 天,到期後自動結算收益</li>
            <li>• 投資金額將用於購買退稅債權,具有固定收益</li>
            <li>• 請根據風險等級選擇適合的投資池</li>
            <li>• 投資前請確保已完成 KYC 驗證</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
