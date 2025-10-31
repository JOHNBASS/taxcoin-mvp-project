import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import rwaPoolService from '../services/rwaPool.service';
import type { Investment } from '../types';
import { useWallet } from '@suiet/wallet-kit';
import { Transaction } from '@mysten/sui/transactions';

export const MyInvestmentsPage = () => {
  const wallet = useWallet();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [claimingPoolId, setClaimingPoolId] = useState<string | null>(null);

  // 統計資料
  const [stats, setStats] = useState({
    totalInvested: 0,
    totalExpectedYield: 0,
    activeCount: 0,
    maturedCount: 0,
  });

  useEffect(() => {
    loadInvestments();
  }, [page]);

  const loadInvestments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await rwaPoolService.getMyInvestments({
        page,
        limit: 10,
      });

      const data = response.data || [];
      const pagination = response.pagination || { totalPages: 1 };

      // Map backend fields to frontend types
      const mappedData = data.map((inv: any) => ({
        ...inv,
        expectedYield: inv.yieldAmount || inv.expectedYield || 0,
        shares: inv.tokenAmount || inv.shares || 0,
        pool: inv.pool ? {
          ...inv.pool,
          name: inv.pool.poolName || inv.pool.name,
        } : undefined,
      }));

      setInvestments(mappedData);
      setTotalPages(pagination.totalPages);

      // 計算統計 - 添加安全檢查
      if (Array.isArray(mappedData) && mappedData.length > 0) {
        const totalInvested = mappedData.reduce((sum, inv) => sum + (Number(inv.investmentAmount) || 0), 0);
        const totalExpectedYield = mappedData.reduce((sum, inv) => sum + (Number(inv.expectedYield) || 0), 0);
        const activeCount = mappedData.filter(
          (inv) => inv.pool && (inv.pool.status === 'RECRUITING' || inv.pool.status === 'FULL')
        ).length;
        const maturedCount = mappedData.filter(
          (inv) => inv.pool && inv.pool.status === 'MATURED'
        ).length;

        setStats({ totalInvested, totalExpectedYield, activeCount, maturedCount });
      } else {
        // 沒有數據時重置統計
        setStats({ totalInvested: 0, totalExpectedYield: 0, activeCount: 0, maturedCount: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 計算天數
   */
  const getDaysRemaining = (maturityDate: string): number => {
    const now = new Date();
    const maturity = new Date(maturityDate);
    const diff = maturity.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
   * 領取收益
   */
  const handleClaimYield = async (poolId: string) => {
    if (!wallet.connected) {
      alert('請先連接錢包');
      return;
    }

    if (!wallet.signAndExecuteTransactionBlock) {
      alert('錢包不支持簽名功能');
      return;
    }

    setClaimingPoolId(poolId);
    setError('');

    try {
      // 1. 構建交易（傳遞錢包地址）
      const walletAddress = wallet.account?.address;
      if (!walletAddress) {
        throw new Error('無法獲取錢包地址');
      }

      const txData = await rwaPoolService.buildClaimTransaction(poolId, walletAddress);

      console.log('領取收益交易數據:', {
        poolAddress: txData.poolAddress,
        poolShareNftId: txData.poolShareNftId,
        expectedTotal: txData.expectedTotal,
      });

      // 2. 直接使用 Base64 字符串構建交易並簽名（與投資流程相同）
      const txBytesBase64 = txData.transactionBytes;
      console.log('交易 Base64:', txBytesBase64);

      // 將 base64 轉回 bytes
      const txBytesArray = Uint8Array.from(atob(txBytesBase64), (c) => c.charCodeAt(0));
      console.log('轉換後的 txBytesArray 長度:', txBytesArray.length);

      // 從完整的 transaction bytes 重建交易
      const tx = Transaction.from(txBytesArray);
      console.log('成功從 bytes 創建交易');

      // 3. 使用錢包簽名並執行
      console.log('開始錢包簽名...');
      const result = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: tx as any, // Type assertion to fix SDK version mismatch
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log('領取收益交易結果:', result);
      console.log('交易 digest:', result.digest);

      // 錢包可能不返回 effects，所以我們直接假設成功
      // 可以透過 digest 在 Suiscan 查詢交易狀態
      if (result.digest) {
        // 調用後端確認領取完成
        try {
          await rwaPoolService.confirmClaimYield(poolId, result.digest);
        } catch (confirmError) {
          console.error('確認領取失敗:', confirmError);
          // 即使確認失敗也不影響交易結果，只是資料庫狀態可能未更新
        }

        alert(
          `收益領取交易已提交！\n` +
          `預計本金: ${txData.expectedPrincipal.toLocaleString()} TWD\n` +
          `預計收益: ${txData.expectedYield.toLocaleString()} TWD\n` +
          `預計總計: ${txData.expectedTotal.toLocaleString()} TWD\n\n` +
          `交易哈希: ${result.digest}\n\n` +
          `請在 Suiscan 查看交易結果:\n` +
          `https://suiscan.xyz/testnet/tx/${result.digest}`
        );

        // 重新載入投資列表
        await loadInvestments();
      } else {
        throw new Error('交易提交失敗：無法獲取交易哈希');
      }
    } catch (err) {
      console.error('領取收益失敗:', err);
      setError(err instanceof Error ? err.message : '領取收益失敗');
    } finally {
      setClaimingPoolId(null);
    }
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">我的投資</h1>
          <p className="text-gray-400">查看和管理您的 RWA Pool 投資</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">總投資金額</div>
            <div className="text-2xl font-bold text-primary-400">
              ${stats.totalInvested.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">預期總收益</div>
            <div className="text-2xl font-bold text-accent-400">
              +${stats.totalExpectedYield.toLocaleString()}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">進行中</div>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400 mb-1">已到期</div>
            <div className="text-2xl font-bold text-success">{stats.maturedCount}</div>
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
        {!isLoading && !error && investments.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">尚無投資記錄</h3>
            <p className="text-gray-400 mb-6">開始瀏覽投資池並進行投資</p>
            <Link to="/pools" className="btn btn-primary">
              瀏覽投資池
            </Link>
          </div>
        )}

        {/* 投資列表 */}
        {!isLoading && !error && investments.length > 0 && (
          <div className="space-y-4">
            {investments.map((investment) => {
              const daysRemaining = investment.pool
                ? getDaysRemaining(investment.pool.maturityDate)
                : 0;
              const isMatured = daysRemaining <= 0;
              const totalReturn = investment.investmentAmount + investment.expectedYield;

              return (
                <div key={investment.id} className="card hover:shadow-glow transition-all">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    {/* 左側資訊 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold">
                          {investment.pool?.name || '未知投資池'}
                        </h3>
                        {isMatured ? (
                          <span className="badge badge-success">已到期</span>
                        ) : (
                          <span className="badge badge-info">進行中</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">投資日期</span>
                          <p className="font-semibold">{formatDate(investment.createdAt)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">份額</span>
                          <p className="font-semibold">{investment.shares} 份</p>
                        </div>
                        <div>
                          <span className="text-gray-400">投資金額</span>
                          <p className="font-semibold text-primary-400">
                            ${investment.investmentAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">預期收益</span>
                          <p className="font-semibold text-accent-400">
                            +${investment.expectedYield.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400">
                            {isMatured ? '總收益' : '剩餘天數'}
                          </span>
                          <p className="font-semibold">
                            {isMatured
                              ? `$${totalReturn.toLocaleString()}`
                              : `${daysRemaining} 天`}
                          </p>
                        </div>
                      </div>

                      {/* 收益率和到期日 */}
                      {investment.pool && (
                        <div className="mt-3 flex gap-4 text-sm">
                          <div className="glass px-3 py-1 rounded-lg">
                            <span className="text-gray-400">年化收益率: </span>
                            <span className="font-semibold text-accent-400">
                              {(investment.pool.yieldRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="glass px-3 py-1 rounded-lg">
                            <span className="text-gray-400">到期日: </span>
                            <span className="font-semibold">
                              {formatDate(investment.pool.maturityDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 右側操作 */}
                    <div className="mt-4 md:mt-0 md:ml-6 flex flex-col gap-2">
                      {investment.pool && (
                        <Link
                          to={`/pools/${investment.poolId}`}
                          className="btn btn-secondary btn-sm"
                        >
                          查看投資池
                        </Link>
                      )}

                      {/* 已領取狀態顯示 */}
                      {investment.status === 'REDEEMED' && (
                        <div className="glass px-4 py-3 rounded-lg border-2 border-green-500/30">
                          <div className="text-center">
                            <div className="text-green-400 font-bold mb-1">✅ 已領取</div>
                            <div className="text-xs text-gray-400 mb-2">
                              {investment.redeemedAt && formatDate(investment.redeemedAt)}
                            </div>
                            <div className="text-sm">
                              <div className="text-gray-400">本金</div>
                              <div className="font-semibold text-primary-400">
                                ${investment.investmentAmount.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm mt-1">
                              <div className="text-gray-400">收益</div>
                              <div className="font-semibold text-green-400">
                                +${(investment.yieldAmount || investment.expectedYield).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm mt-2 pt-2 border-t border-gray-700">
                              <div className="text-gray-400">總計</div>
                              <div className="font-bold text-lg text-accent-400">
                                ${(investment.investmentAmount + (investment.yieldAmount || investment.expectedYield)).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 領取收益按鈕 - 只在 SETTLED 且未領取時顯示 */}
                      {investment.pool?.status === 'SETTLED' && investment.status !== 'REDEEMED' && (
                        <button
                          onClick={() => handleClaimYield(investment.poolId)}
                          disabled={claimingPoolId === investment.poolId}
                          className="btn btn-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {claimingPoolId === investment.poolId ? '領取中...' : '💰 領取收益'}
                        </button>
                      )}

                      {investment.pool?.status === 'MATURED' && investment.status !== 'REDEEMED' && (
                        <div className="text-xs text-yellow-400 text-center">
                          等待結算...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 進度條 (未到期顯示) */}
                  {!isMatured && investment.pool && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">投資進度</span>
                        <span className="font-semibold">
                          {Math.max(
                            0,
                            Number(
                              (((7 - daysRemaining) / 7) * 100).toFixed(0)
                            )
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                          style={{
                            width: `${Math.max(0, ((7 - daysRemaining) / 7) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
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
      </div>
    </div>
  );
};
