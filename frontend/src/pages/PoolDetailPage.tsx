import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import rwaPoolService from '../services/rwaPool.service';
import investmentService from '../services/investment.service';
import type { RwaPool } from '../types';
import { useWallet } from '@suiet/wallet-kit';

export const PoolDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const wallet = useWallet();

  const [pool, setPool] = useState<RwaPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvesting, setIsInvesting] = useState(false);
  const [error, setError] = useState<string>('');
  const [shares, setShares] = useState<number>(1);
  const [showInvestModal, setShowInvestModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadPool();
    }
  }, [id]);

  const loadPool = async () => {
    if (!id) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await rwaPoolService.getPoolById(id);
      setPool(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 投資 - 使用錢包簽名
   */
  const handleInvest = async () => {
    if (!pool || !id) return;

    if (shares < 1) {
      setError('投資份額至少為 1');
      return;
    }

    if (shares > pool.availableShares) {
      setError(`可用份額不足,目前剩餘 ${pool.availableShares} 份`);
      return;
    }

    // 檢查錢包連接
    if (!wallet.connected) {
      setError('請先連接 Sui 錢包');
      return;
    }

    if (!wallet.signAndExecuteTransactionBlock) {
      setError('錢包不支持簽名功能');
      return;
    }

    setIsInvesting(true);
    setError('');

    try {
      // 計算投資金額
      const amount = shares * pool.sharePrice;

      console.log('開始投資流程:', { poolId: id, amount, shares });

      // 使用新的投資服務（前端直接構建交易並簽名）
      await investmentService.invest(
        id,
        amount,
        wallet.signAndExecuteTransactionBlock,
        wallet.address!,
        pool.poolContractId!
      );

      setShowInvestModal(false);

      // 顯示成功訊息並跳轉
      alert('投資成功！TaxCoin 已從您的錢包扣除，並獲得投資憑證 NFT。即將跳轉到我的投資頁面');
      navigate('/my-investments');
    } catch (err) {
      console.error('投資失敗:', err);
      setError(err instanceof Error ? err.message : '投資失敗');
    } finally {
      setIsInvesting(false);
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

  if (error && !pool) {
    return (
      <div className="container-responsive py-8">
        <div className="card p-6 bg-red-500/10 border-red-500/50">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/pools')} className="btn btn-secondary">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  if (!pool) return null;

  const fillRate = ((pool.totalShares - pool.availableShares) / pool.totalShares) * 100;
  const investmentAmount = shares * pool.sharePrice;
  const expectedYield = investmentAmount * pool.yieldRate;
  const totalReturn = investmentAmount + expectedYield;
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(pool.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* 返回按鈕 */}
        <button onClick={() => navigate('/pools')} className="btn btn-secondary btn-sm mb-6">
          ← 返回列表
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 左側 - 投資池詳情 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本資訊 */}
            <div className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{pool.name}</h1>
                  <p className="text-gray-400">{pool.description}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="badge badge-success">{pool.status}</span>
                  <span className="badge badge-warning">{pool.riskLevel}</span>
                </div>
              </div>

              {/* 關鍵指標 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">年化收益率</div>
                  <div className="text-2xl font-bold text-accent-400">
                    {(pool.yieldRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">總價值</div>
                  <div className="text-2xl font-bold text-primary-400">
                    ${pool.totalValue.toLocaleString()}
                  </div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">單價</div>
                  <div className="text-2xl font-bold">${pool.sharePrice}</div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">投資者</div>
                  <div className="text-2xl font-bold">{pool.investorCount}</div>
                </div>
              </div>

              {/* 填充率 */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">填充率</span>
                  <span className="font-semibold">
                    {fillRate.toFixed(1)}% ({pool.totalShares - pool.availableShares} / {pool.totalShares} 份)
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                    style={{ width: `${fillRate}%` }}
                  />
                </div>
              </div>

              {/* 到期資訊 */}
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">到期日期</div>
                  <div className="text-lg font-semibold">
                    {new Date(pool.maturityDate).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">剩餘天數</div>
                  <div className="text-lg font-semibold">{daysRemaining} 天</div>
                </div>
              </div>
            </div>

            {/* 區塊鏈資訊 */}
            <div className="card bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/30">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h2 className="text-xl font-semibold">區塊鏈資訊</h2>
              </div>

              {pool.poolContractId ? (
                <div className="space-y-3">
                  <div className="glass p-4 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Pool Contract ID</div>
                    <div className="font-mono text-sm break-all text-primary-300">
                      {pool.poolContractId}
                    </div>
                    <a
                      href={`https://suiscan.xyz/testnet/object/${pool.poolContractId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent-400 hover:text-accent-300 mt-2 inline-flex items-center gap-1"
                    >
                      在 Sui Explorer 查看
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    已部署到 Sui 區塊鏈
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  此投資池尚未部署到區塊鏈
                </div>
              )}
            </div>

            {/* 資產明細 */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">資產明細</h2>
              <div className="space-y-3">
                {pool.assets && pool.assets.length > 0 ? (
                  pool.assets.map((asset, index) => (
                    <div key={index} className="glass p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-semibold">退稅債權 #{asset.claimId.slice(0, 8)}</div>
                        <div className="text-sm text-gray-400">
                          購物金額: ${asset.amount.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary-400">
                          ${asset.taxAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">退稅金額</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">暫無資產資訊</div>
                )}
              </div>
            </div>
          </div>

          {/* 右側 - 投資面板 */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h2 className="text-xl font-semibold mb-4">投資計算</h2>

              {/* 份額輸入 */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">投資份額</label>
                <input
                  type="number"
                  min="1"
                  max={pool.availableShares}
                  value={shares}
                  onChange={(e) => setShares(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="input w-full"
                  placeholder="輸入份額"
                />
                <div className="text-xs text-gray-400 mt-1">
                  可用份額: {pool.availableShares} 份
                </div>
              </div>

              {/* 計算結果 */}
              <div className="space-y-3 mb-6">
                <div className="glass p-3 rounded-lg flex justify-between">
                  <span className="text-gray-400">投資金額</span>
                  <span className="font-semibold">${investmentAmount.toLocaleString()}</span>
                </div>
                <div className="glass p-3 rounded-lg flex justify-between">
                  <span className="text-gray-400">預期收益</span>
                  <span className="font-semibold text-accent-400">
                    +${expectedYield.toLocaleString()}
                  </span>
                </div>
                <div className="glass p-3 rounded-lg flex justify-between">
                  <span className="text-gray-400">到期總額</span>
                  <span className="font-bold text-lg text-primary-400">
                    ${totalReturn.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 投資按鈕 */}
              <button
                onClick={() => setShowInvestModal(true)}
                disabled={pool.status !== 'RECRUITING' || pool.availableShares === 0}
                className="btn btn-primary w-full mb-4"
              >
                {pool.status !== 'RECRUITING'
                  ? '投資池已關閉'
                  : pool.availableShares === 0
                  ? 'FULL'
                  : '確認投資'}
              </button>

              {/* 風險提示 */}
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
                <p className="text-xs text-yellow-400">
                  ⚠️ 投資有風險,請謹慎評估。投資前請確保已了解相關風險。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 投資確認 Modal */}
        {showInvestModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="card max-w-md w-full animate-fade-in">
              <h2 className="text-2xl font-bold mb-4">確認投資</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">投資池</span>
                  <span className="font-semibold">{pool.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">投資份額</span>
                  <span className="font-semibold">{shares} 份</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">投資金額</span>
                  <span className="font-semibold">${investmentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">預期收益</span>
                  <span className="font-semibold text-accent-400">
                    +${expectedYield.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-400">到期總額</span>
                  <span className="font-bold text-primary-400">
                    ${totalReturn.toLocaleString()}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowInvestModal(false);
                    setError('');
                  }}
                  disabled={isInvesting}
                  className="btn btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  onClick={handleInvest}
                  disabled={isInvesting}
                  className="btn btn-primary flex-1"
                >
                  {isInvesting ? '處理中...' : '確認投資'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
