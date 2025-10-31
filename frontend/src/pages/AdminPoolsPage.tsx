import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import rwaPoolService from '../services/rwaPool.service';
import type { RwaPool, PoolStatus } from '../types';

export const AdminPoolsPage = () => {
  const [pools, setPools] = useState<RwaPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [processingPoolId, setProcessingPoolId] = useState<string | null>(null);

  // 測試功能相關狀態
  const [showMaturityModal, setShowMaturityModal] = useState(false);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [newMaturityDate, setNewMaturityDate] = useState('');
  const [yieldAmount, setYieldAmount] = useState('');

  // 創建表單狀態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sharePrice: '',
    totalShares: '',
    yieldRate: '',
    maturityDays: '',
    riskLevel: 'MEDIUM',
  });

  useEffect(() => {
    loadPools();
  }, [page, selectedStatus]);

  const loadPools = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await rwaPoolService.getPools({
        page,
        limit: 10,
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

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setError('');

    try {
      await rwaPoolService.createPool({
        name: formData.name,
        description: formData.description,
        sharePrice: parseFloat(formData.sharePrice),
        totalShares: parseInt(formData.totalShares),
        yieldRate: parseFloat(formData.yieldRate) / 100,
        maturityDays: parseInt(formData.maturityDays),
        riskLevel: formData.riskLevel,
      });

      setFormData({
        name: '',
        description: '',
        sharePrice: '',
        totalShares: '',
        yieldRate: '',
        maturityDays: '',
        riskLevel: 'MEDIUM',
      });

      setShowCreateModal(false);
      await loadPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : '創建失敗');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusBadge = (status: PoolStatus) => {
    switch (status) {
      case 'RECRUITING':
        return <span className="badge badge-success">募集中</span>;
      case 'FULL':
        return <span className="badge badge-info">已滿額</span>;
      case 'MATURED':
        return <span className="badge badge-warning">已到期</span>;
      case 'REDEEMED':
        return <span className="badge">已兌現</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const getRiskLevelBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <span className="text-green-400">低風險</span>;
      case 'MEDIUM':
        return <span className="text-yellow-400">中風險</span>;
      case 'HIGH':
        return <span className="text-red-400">高風險</span>;
      default:
        return <span>{level}</span>;
    }
  };

  /**
   * 手動觸發池狀態更新（測試用）
   */
  const handleCheckStatus = async (poolId: string) => {
    setProcessingPoolId(poolId);
    setError('');

    try {
      const result = await rwaPoolService.checkPoolStatus(poolId);
      alert(`池狀態已更新！\n交易哈希: ${result.txHash.slice(0, 20)}...`);
      await loadPools(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '狀態更新失敗');
    } finally {
      setProcessingPoolId(null);
    }
  };

  /**
   * 結算投資池
   */
  const handleSettlePool = async (poolId: string) => {
    if (!confirm('確定要結算此投資池嗎？\n\n系統將自動計算並注入收益，然後完成結算。\n結算後投資者可以領取收益。')) {
      return;
    }

    setProcessingPoolId(poolId);
    setError('');

    try {
      const result = await rwaPoolService.settlePool(poolId);

      // 顯示詳細的結算信息
      const message = result.totalYield
        ? `結算成功！\n\n` +
          `💰 已自動注入收益\n` +
          `✅ 交易哈希: ${result.txHash?.slice(0, 20)}...\n\n` +
          `投資者現在可以領取收益！`
        : `結算成功！\n${result.message || ''}\n交易哈希: ${result.txHash?.slice(0, 20)}...`;

      alert(message);
      await loadPools(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '結算失敗');
    } finally {
      setProcessingPoolId(null);
    }
  };

  /**
   * 🧪 修改投資池到期日（測試用）
   */
  const handleUpdateMaturityDate = async () => {
    if (!newMaturityDate) {
      setError('請選擇新的到期日');
      return;
    }

    setProcessingPoolId(selectedPoolId);
    setError('');

    try {
      const result = await rwaPoolService.updateMaturityDate(
        selectedPoolId,
        new Date(newMaturityDate)
      );
      alert(`到期日已更新！\n${result.message}\n交易哈希: ${result.txHash.slice(0, 20)}...`);
      setShowMaturityModal(false);
      setNewMaturityDate('');
      setSelectedPoolId('');
      await loadPools(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改到期日失敗');
    } finally {
      setProcessingPoolId(null);
    }
  };

  /**
   * 🧪 更新池狀態到 MATURED（測試用）
   */
  const handleUpdateStatusToMatured = async (poolId: string) => {
    if (!confirm('確定要將池狀態更新為 MATURED 嗎？這將允許進行結算。')) {
      return;
    }

    setProcessingPoolId(poolId);
    setError('');

    try {
      const result = await rwaPoolService.updateStatusToMatured(poolId);
      alert(`池狀態已更新！\n${result.message}\n交易哈希: ${result.txHash.slice(0, 20)}...`);
      await loadPools(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新狀態失敗');
    } finally {
      setProcessingPoolId(null);
    }
  };

  /**
   * 💰 注入收益到投資池
   */
  const handleDepositYield = async () => {
    if (!yieldAmount || parseFloat(yieldAmount) <= 0) {
      setError('請輸入有效的收益金額');
      return;
    }

    if (!confirm(`確定要注入 ${yieldAmount} TaxCoin 作為收益嗎？`)) {
      return;
    }

    setProcessingPoolId(selectedPoolId);
    setError('');

    try {
      const result = await rwaPoolService.depositYield(
        selectedPoolId,
        parseFloat(yieldAmount)
      );
      alert(`收益已注入！\n${result.message}\n交易哈希: ${result.txHash.slice(0, 20)}...`);
      setShowYieldModal(false);
      setYieldAmount('');
      setSelectedPoolId('');
      await loadPools(); // 重新載入列表
    } catch (err) {
      setError(err instanceof Error ? err.message : '注入收益失敗');
    } finally {
      setProcessingPoolId(null);
    }
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">投資池管理</h1>
            <p className="text-gray-400">創建和管理 RWA 投資池</p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary mt-4 md:mt-0"
          >
            <span className="mr-2">+</span>
            創建投資池
          </button>
        </div>

        <div className="card mb-6">
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setSelectedStatus('')} className={`btn btn-sm ${selectedStatus === '' ? 'btn-primary' : 'btn-secondary'}`}>全部</button>
            <button onClick={() => setSelectedStatus('RECRUITING')} className={`btn btn-sm ${selectedStatus === 'RECRUITING' ? 'btn-primary' : 'btn-secondary'}`}>募集中</button>
            <button onClick={() => setSelectedStatus('FULL')} className={`btn btn-sm ${selectedStatus === 'FULL' ? 'btn-primary' : 'btn-secondary'}`}>已滿額</button>
            <button onClick={() => setSelectedStatus('MATURED')} className={`btn btn-sm ${selectedStatus === 'MATURED' ? 'btn-primary' : 'btn-secondary'}`}>已到期</button>
          </div>
        </div>

        {isLoading && (
          <div className="card text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">載入中...</p>
          </div>
        )}

        {error && !isLoading && !showCreateModal && (
          <div className="card p-6 bg-red-500/10 border-red-500/50 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!isLoading && !error && pools.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">尚無投資池</h3>
            <p className="text-gray-400 mb-6">創建第一個投資池開始募資</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">創建投資池</button>
          </div>
        )}

        {!isLoading && !error && pools.length > 0 && (
          <div className="space-y-4">
            {pools.map((pool) => {
              const fillRate = (pool.currentAmount / pool.targetAmount) * 100;
              const investorCount = pool.investments?.length || 0;

              return (
                <div key={pool.id} className="card hover:shadow-glow transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold">{pool.name}</h3>
                        {getStatusBadge(pool.status)}
                      </div>
                      <p className="text-gray-400 text-sm">{pool.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-gray-400">目標金額</span><p className="font-semibold text-primary-400">${pool.targetAmount.toLocaleString()}</p></div>
                        <div><span className="text-gray-400">已募集</span><p className="font-semibold text-accent-400">${pool.currentAmount.toLocaleString()}</p></div>
                        <div><span className="text-gray-400">年化收益率</span><p className="font-semibold text-success">{(pool.yieldRate * 100).toFixed(1)}%</p></div>
                        <div><span className="text-gray-400">風險等級</span><p className="font-semibold">{getRiskLevelBadge(pool.riskLevel)}</p></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">募集進度</span><span className="font-semibold">{fillRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${Math.min(100, fillRate)}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="glass px-3 py-1 rounded-lg"><span className="text-gray-400">投資人數: </span><span className="font-semibold">{investorCount}</span></div>
                        <div className="glass px-3 py-1 rounded-lg"><span className="text-gray-400">到期日: </span><span className="font-semibold">{formatDate(pool.maturityDate)}</span></div>
                        <div className="glass px-3 py-1 rounded-lg"><span className="text-gray-400">創建時間: </span><span className="font-semibold">{formatDate(pool.createdAt)}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 lg:ml-6">
                      <Link to={`/pools/${pool.id}`} className="btn btn-secondary btn-sm">查看詳情</Link>

                      {/* 測試用：手動觸發狀態更新 */}
                      {pool.status === 'RECRUITING' && (
                        <button
                          onClick={() => handleCheckStatus(pool.id)}
                          disabled={processingPoolId === pool.id}
                          className="btn btn-sm bg-blue-600 hover:bg-blue-700"
                        >
                          {processingPoolId === pool.id ? '更新中...' : '🔄 檢查狀態'}
                        </button>
                      )}

                      {/* 測試功能：修改到期日、更新狀態和注入收益 */}
                      {(pool.status === 'FULL' || pool.status === 'MATURED') && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPoolId(pool.id);
                              setShowMaturityModal(true);
                            }}
                            disabled={processingPoolId === pool.id}
                            className="btn btn-sm bg-yellow-600 hover:bg-yellow-700"
                          >
                            🧪 修改到期日
                          </button>

                          {pool.status === 'FULL' && (
                            <button
                              onClick={() => handleUpdateStatusToMatured(pool.id)}
                              disabled={processingPoolId === pool.id}
                              className="btn btn-sm bg-orange-600 hover:bg-orange-700"
                            >
                              {processingPoolId === pool.id ? '更新中...' : '🔄 更新為 MATURED'}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedPoolId(pool.id);
                              setShowYieldModal(true);
                            }}
                            disabled={processingPoolId === pool.id}
                            className="btn btn-sm bg-purple-600 hover:bg-purple-700"
                          >
                            💰 注入收益
                          </button>
                        </>
                      )}

                      {/* 結算按鈕 */}
                      {(pool.status === 'FULL' || pool.status === 'MATURED') && (
                        <button
                          onClick={() => handleSettlePool(pool.id)}
                          disabled={processingPoolId === pool.id}
                          className="btn btn-sm bg-green-600 hover:bg-green-700"
                        >
                          {processingPoolId === pool.id ? '結算中...' : '✓ 結算池'}
                        </button>
                      )}

                      {pool.status === 'SETTLED' && (
                        <div className="text-sm text-green-400 text-center">
                          ✓ 已結算
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">上一頁</button>
            <div className="flex gap-2">{Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (<button key={p} onClick={() => setPage(p)} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}>{p}</button>))}</div>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm">下一頁</button>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">創建投資池</h2>
                <button onClick={() => { setShowCreateModal(false); setError(''); }} className="text-gray-400 hover:text-white">✕</button>
              </div>
              {error && (<div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg mb-6"><p className="text-red-400 text-sm">{error}</p></div>)}
              <form onSubmit={handleCreatePool} className="space-y-6">
                <div><label className="block text-sm font-semibold mb-2">投資池名稱 *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="例: 台北商業不動產基金 Q1" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                <div><label className="block text-sm font-semibold mb-2">投資池描述 *</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="描述投資標的、預期收益來源、風險因素等" required rows={4} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-2">每份價格 (USD) *</label><input type="number" step="0.01" min="0" value={formData.sharePrice} onChange={(e) => setFormData({ ...formData, sharePrice: e.target.value })} onFocus={(e) => e.target.select()} placeholder="100" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                  <div><label className="block text-sm font-semibold mb-2">總份額 *</label><input type="number" min="1" value={formData.totalShares} onChange={(e) => setFormData({ ...formData, totalShares: e.target.value })} onFocus={(e) => e.target.select()} placeholder="1000" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-semibold mb-2">年化收益率 (%) *</label><input type="number" step="0.1" min="0" max="100" value={formData.yieldRate} onChange={(e) => setFormData({ ...formData, yieldRate: e.target.value })} onFocus={(e) => e.target.select()} placeholder="8.5" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                  <div><label className="block text-sm font-semibold mb-2">到期天數 *</label><input type="number" min="1" value={formData.maturityDays} onChange={(e) => setFormData({ ...formData, maturityDays: e.target.value })} onFocus={(e) => e.target.select()} placeholder="365" required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-2">風險等級 *</label><select value={formData.riskLevel} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })} required className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"><option value="LOW">低風險</option><option value="MEDIUM">中風險</option><option value="HIGH">高風險</option></select></div>
                {formData.sharePrice && formData.totalShares && (<div className="p-4 bg-primary-500/10 border border-primary-500/50 rounded-lg"><p className="text-sm text-gray-400 mb-1">目標募集金額</p><p className="text-2xl font-bold text-primary-400">${(parseFloat(formData.sharePrice || '0') * parseInt(formData.totalShares || '0')).toLocaleString()}</p></div>)}
                <div className="flex gap-3">
                  <button type="submit" disabled={isCreating} className="btn btn-primary flex-1">{isCreating ? '創建中...' : '創建投資池'}</button>
                  <button type="button" onClick={() => { setShowCreateModal(false); setError(''); }} disabled={isCreating} className="btn btn-secondary">取消</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🧪 修改到期日 Modal */}
        {showMaturityModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">🧪 修改到期日（測試用）</h2>
                <button
                  onClick={() => {
                    setShowMaturityModal(false);
                    setError('');
                    setNewMaturityDate('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    新的到期日 *
                  </label>
                  <input
                    type="datetime-local"
                    value={newMaturityDate}
                    onChange={(e) => setNewMaturityDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    ⚠️ 此功能僅用於測試。修改到期日將允許提前結算投資池。
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleUpdateMaturityDate}
                    disabled={processingPoolId === selectedPoolId}
                    className="btn btn-primary flex-1"
                  >
                    {processingPoolId === selectedPoolId ? '更新中...' : '確認修改'}
                  </button>
                  <button
                    onClick={() => {
                      setShowMaturityModal(false);
                      setError('');
                      setNewMaturityDate('');
                    }}
                    disabled={processingPoolId === selectedPoolId}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 💰 注入收益 Modal */}
        {showYieldModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">💰 注入收益</h2>
                <button
                  onClick={() => {
                    setShowYieldModal(false);
                    setError('');
                    setYieldAmount('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg mb-6">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    收益金額 (TaxCoin) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yieldAmount}
                    onChange={(e) => setYieldAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="1000.00"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    💡 Admin 將鑄造新的 TaxCoin 注入到投資池作為收益。
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDepositYield}
                    disabled={processingPoolId === selectedPoolId}
                    className="btn btn-primary flex-1"
                  >
                    {processingPoolId === selectedPoolId ? '注入中...' : '確認注入'}
                  </button>
                  <button
                    onClick={() => {
                      setShowYieldModal(false);
                      setError('');
                      setYieldAmount('');
                    }}
                    disabled={processingPoolId === selectedPoolId}
                    className="btn btn-secondary"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
