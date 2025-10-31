import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@suiet/wallet-kit';
import taxClaimService from '../services/taxClaim.service';
import TaxClaimNFTCard from '../components/TaxClaimNFTCard';
import type { TaxClaim, TaxClaimStatus } from '../types';

const statusConfig: Record<
  TaxClaimStatus,
  { label: string; color: string; bgColor: string }
> = {
  PENDING: { label: '待審核', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  APPROVED: { label: '已核准', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  REJECTED: { label: '已拒絕', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  DISBURSED: { label: '已發放', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
};

export const TaxClaimListPage = () => {
  const navigate = useNavigate();
  const { account } = useWallet();
  const [claims, setClaims] = useState<TaxClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'nft'>('list'); // 新增：視圖切換

  /**
   * 載入申請列表
   */
  const loadClaims = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await taxClaimService.getMyClaims({
        page,
        limit: 10,
        status: selectedStatus || undefined,
      });

      setClaims(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [page, selectedStatus]);

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  /**
   * 將狀態字串轉換為數字
   */
  const getStatusNumber = (status: TaxClaimStatus): number => {
    const statusMap: Record<TaxClaimStatus, number> = {
      PENDING: 0,
      APPROVED: 1,
      REJECTED: 2,
      DISBURSED: 3,
    };
    return statusMap[status] || 0;
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-6xl mx-auto">
        {/* 標題和操作 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">我的退稅申請</h1>
            <p className="text-gray-400">查看和管理您的退稅申請記錄</p>
          </div>

          <Link to="/tax-claims/new" className="btn btn-primary mt-4 md:mt-0">
            <span className="mr-2">+</span>
            新增申請
          </Link>
        </div>

        {/* 篩選器和視圖切換 */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* 狀態篩選 */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedStatus('')}
                className={`btn btn-sm ${
                  selectedStatus === '' ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                全部
              </button>
              {Object.entries(statusConfig).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`btn btn-sm ${
                    selectedStatus === status ? 'btn-primary' : 'btn-secondary'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>

            {/* 視圖切換 */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`btn btn-sm ${
                  viewMode === 'list' ? 'btn-primary' : 'btn-secondary'
                }`}
                title="列表視圖"
              >
                📋 列表
              </button>
              <button
                onClick={() => setViewMode('nft')}
                className={`btn btn-sm ${
                  viewMode === 'nft' ? 'btn-primary' : 'btn-secondary'
                }`}
                title="NFT 卡片視圖"
              >
                🖼️ NFT
              </button>
            </div>
          </div>
        </div>

        {/* Loading 狀態 */}
        {isLoading && (
          <div className="card text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">載入中...</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && !isLoading && (
          <div className="card p-6 bg-red-500/10 border-red-500/50">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && !error && claims.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">尚無退稅申請</h3>
            <p className="text-gray-400 mb-6">開始上傳您的購物收據申請退稅</p>
            <Link to="/tax-claims/new" className="btn btn-primary">
              立即申請
            </Link>
          </div>
        )}

        {/* 申請列表 - 列表視圖 */}
        {!isLoading && !error && claims.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div key={claim.id} className="card hover:shadow-glow transition-all">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  {/* 左側資訊 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        退稅申請 #{claim.id.slice(0, 8)}
                      </h3>
                      <span
                        className={`
                          px-3 py-1 rounded-full text-sm font-semibold
                          ${statusConfig[claim.status].color}
                          ${statusConfig[claim.status].bgColor}
                        `}
                      >
                        {statusConfig[claim.status].label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">申請日期:</span>
                        <p className="font-semibold">{formatDate(claim.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">總金額:</span>
                        <p className="font-semibold text-primary-400">
                          NT$ {claim.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">退稅金額:</span>
                        <p className="font-semibold text-accent-400">
                          NT$ {claim.taxAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">收據數量:</span>
                        <p className="font-semibold">{claim.receiptImages?.length || 0} 張</p>
                      </div>
                    </div>

                    {/* 審核備註 */}
                    {claim.reviewNotes && (
                      <div className="mt-3 p-3 rounded-lg bg-gray-800/50">
                        <span className="text-xs text-gray-400">審核備註: </span>
                        <span className="text-sm">{claim.reviewNotes}</span>
                      </div>
                    )}

                    {/* NFT / 交易資訊 */}
                    {claim.nftTokenId && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-400">NFT Token ID:</span>
                        <code className="px-2 py-1 bg-gray-800 rounded font-mono text-primary-400">
                          {claim.nftTokenId.slice(0, 16)}...
                        </code>
                      </div>
                    )}
                  </div>

                  {/* 右側操作 */}
                  <div className="mt-4 md:mt-0 md:ml-6 flex gap-3">
                    <button
                      onClick={() => navigate(`/tax-claims/${claim.id}`)}
                      className="btn btn-secondary btn-sm"
                    >
                      查看詳情
                    </button>
                    {claim.txHash && (
                      <a
                        href={`https://suiexplorer.com/txblock/${claim.txHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        查看交易
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 申請列表 - NFT 視圖 */}
        {!isLoading && !error && claims.length > 0 && viewMode === 'nft' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => {
              // 將 claim 數據轉換為 NFT 卡片所需格式
              const nftData = {
                id: claim.id,
                claim_id: claim.id.slice(0, 8),
                original_owner: account?.address,
                is_soulbound: true, // 預設為靈魂綁定
                status: getStatusNumber(claim.status),
                tax_amount: claim.taxAmount * 100, // 轉換為分
                merchant_name: claim.ocrResult?.merchantName || '未知商家',
                created_at: new Date(claim.createdAt).getTime(),
                nftTokenId: claim.nftTokenId,
              };

              return (
                <TaxClaimNFTCard
                  key={claim.id}
                  nft={nftData}
                  currentUserAddress={account?.address}
                  showTransferButton={false}
                />
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`btn btn-sm ${
                    p === page ? 'btn-primary' : 'btn-secondary'
                  }`}
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
