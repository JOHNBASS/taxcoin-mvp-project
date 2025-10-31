import { useState, useEffect } from 'react';
import taxClaimService from '../services/taxClaim.service';
import EmergencyTransferModal from '../components/EmergencyTransferModal';
import type { TaxClaim, TaxClaimStatus } from '../types';

const statusConfig: Record<TaxClaimStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: '待審核', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  APPROVED: { label: '已核准', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  REJECTED: { label: '已拒絕', color: 'text-red-400', bgColor: 'bg-red-500/10' },
  DISBURSED: { label: '已發放', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
};

export const AdminClaimsPage = () => {
  const [claims, setClaims] = useState<TaxClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedClaim, setSelectedClaim] = useState<TaxClaim | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    loadClaims();
  }, [page, selectedStatus]);

  const loadClaims = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await taxClaimService.getAllClaims({
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

  /**
   * 審核申請
   */
  const handleReview = async (action: 'approve' | 'reject') => {
    if (!selectedClaim) return;

    if (action === 'reject' && !reviewNotes.trim()) {
      setError('拒絕時請填寫拒絕原因');
      return;
    }

    setIsReviewing(true);
    setError('');

    try {
      await taxClaimService.reviewClaim(selectedClaim.id, {
        action,
        notes: reviewNotes.trim() || undefined,
      });

      // 重新載入列表
      await loadClaims();

      // 關閉 modal
      setSelectedClaim(null);
      setReviewNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '審核失敗');
    } finally {
      setIsReviewing(false);
    }
  };

  /**
   * 手動發放 Token
   */
  const handleDisburse = async () => {
    if (!selectedClaim) return;

    setIsDisbursing(true);
    setError('');

    try {
      const result = await taxClaimService.disburseTokens(selectedClaim.id);

      alert(`Token 發放成功！\n\n交易哈希: ${result.txHash}\nNFT ID: ${result.nftObjectId}\n發放數量: ${result.taxCoinAmount} TaxCoin`);

      // 重新載入列表
      await loadClaims();

      // 關閉 modal
      setSelectedClaim(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token 發放失敗');
    } finally {
      setIsDisbursing(false);
    }
  };

  /**
   * 緊急轉移 NFT
   */
  const handleEmergencyTransfer = async (newOwner: string, reason: string) => {
    if (!selectedClaim) return;

    try {
      await taxClaimService.emergencyTransferNFT(selectedClaim.id, {
        newOwner,
        reason,
      });

      alert('NFT 緊急轉移成功！');

      // 重新載入列表
      await loadClaims();

      // 關閉轉移 modal
      setShowTransferModal(false);
    } catch (err) {
      throw err; // 讓 EmergencyTransferModal 處理錯誤
    }
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">退稅申請管理</h1>
          <p className="text-gray-400">審核和管理所有退稅申請</p>
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
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="card text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-400">載入中...</p>
          </div>
        )}

        {/* 錯誤 */}
        {error && !isLoading && !selectedClaim && (
          <div className="card p-6 bg-red-500/10 border-red-500/50">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && !error && claims.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">暫無申請</h3>
            <p className="text-gray-400">目前沒有符合篩選條件的申請</p>
          </div>
        )}

        {/* 申請列表 */}
        {!isLoading && !error && claims.length > 0 && (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div key={claim.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  {/* 左側資訊 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">#{claim.id.slice(0, 8)}</h3>
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

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-400">申請時間</span>
                        <p className="font-semibold">{formatDate(claim.createdAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">總金額</span>
                        <p className="font-semibold text-primary-400">
                          NT$ {claim.totalAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">退稅金額</span>
                        <p className="font-semibold text-accent-400">
                          NT$ {claim.taxAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">收據數量</span>
                        <p className="font-semibold">{claim.receiptImages?.length || 0} 張</p>
                      </div>
                      <div>
                        <span className="text-gray-400">使用者 ID</span>
                        <p className="font-semibold font-mono text-xs">{claim.userId.slice(0, 8)}</p>
                      </div>
                    </div>

                    {/* OCR 結果 */}
                    {claim.ocrResult && (
                      <div className="glass p-3 rounded-lg text-sm">
                        <span className="text-gray-400">OCR 識別: </span>
                        {claim.ocrResult.merchantName && (
                          <span className="mr-3">商家: {claim.ocrResult.merchantName}</span>
                        )}
                        {claim.ocrResult.purchaseDate && (
                          <span className="mr-3">日期: {claim.ocrResult.purchaseDate}</span>
                        )}
                        {claim.ocrResult.confidence !== undefined && (
                          <span>信心度: {(claim.ocrResult.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    )}

                    {/* 審核備註 */}
                    {claim.reviewNotes && (
                      <div className="mt-2 p-3 rounded-lg bg-gray-800/50 text-sm">
                        <span className="text-gray-400">審核備註: </span>
                        <span>{claim.reviewNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* 右側操作 */}
                  <div className="mt-4 md:mt-0 md:ml-6 flex gap-3">
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="btn btn-primary btn-sm"
                    >
                      {claim.status === 'PENDING' ? '審核' : '查看'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

        {/* 審核 Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="card max-w-4xl w-full my-8 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">審核退稅申請</h2>

              {/* 申請資訊 */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">申請 ID</div>
                  <div className="font-mono">{selectedClaim.id}</div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">申請時間</div>
                  <div>{formatDate(selectedClaim.createdAt)}</div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">總金額</div>
                  <div className="text-xl font-bold text-primary-400">
                    NT$ {selectedClaim.totalAmount.toLocaleString()}
                  </div>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">退稅金額</div>
                  <div className="text-xl font-bold text-accent-400">
                    NT$ {selectedClaim.taxAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 機票資訊 */}
              {(selectedClaim.entryFlight || selectedClaim.exitFlight) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">機票資訊</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 入境資訊 */}
                    {selectedClaim.entryFlight && (
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">✈️ 入境航班</div>
                        <div className="font-semibold text-lg mb-2">
                          {selectedClaim.entryFlight}
                        </div>
                        {selectedClaim.entryFlightDate && (
                          <div className="text-sm text-gray-400">
                            {new Date(selectedClaim.entryFlightDate).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 出境資訊 */}
                    {selectedClaim.exitFlight && (
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-gray-400 mb-2">🛫 出境航班</div>
                        <div className="font-semibold text-lg mb-2">
                          {selectedClaim.exitFlight}
                        </div>
                        {selectedClaim.exitFlightDate && (
                          <div className="text-sm text-gray-400">
                            {new Date(selectedClaim.exitFlightDate).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 收據圖片 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">收據圖片</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(selectedClaim.receiptImages || []).map((image, index) => (
                    <div key={index} className="glass p-2 rounded-lg">
                      <img
                        src={image}
                        alt={`收據 ${index + 1}`}
                        className="w-full h-48 object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 審核備註輸入 */}
              {selectedClaim.status === 'PENDING' && (
                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2">審核備註</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="填寫審核意見或拒絕原因"
                    className="input w-full h-24 resize-none"
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedClaim(null);
                    setReviewNotes('');
                    setError('');
                  }}
                  disabled={isReviewing || isDisbursing}
                  className="btn btn-secondary flex-1"
                >
                  關閉
                </button>

                {selectedClaim.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleReview('reject')}
                      disabled={isReviewing}
                      className="btn btn-outline flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
                    >
                      {isReviewing ? '處理中...' : '拒絕'}
                    </button>
                    <button
                      onClick={() => handleReview('approve')}
                      disabled={isReviewing}
                      className="btn btn-primary flex-1"
                    >
                      {isReviewing ? '處理中...' : '核准'}
                    </button>
                  </>
                )}

                {selectedClaim.status === 'APPROVED' && (
                  <button
                    onClick={handleDisburse}
                    disabled={isDisbursing}
                    className="btn btn-primary flex-1"
                  >
                    {isDisbursing ? '發放中...' : '發放 Token'}
                  </button>
                )}

                {selectedClaim.status === 'DISBURSED' && (
                  <>
                    <div className="flex-1 glass p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <span>Token 已發放</span>
                        <span className="text-lg" title="靈魂綁定 NFT">🔒</span>
                      </div>
                      {selectedClaim.nftTokenId && (
                        <>
                          <div className="text-xs font-mono break-all mb-2">
                            NFT ID: {selectedClaim.nftTokenId}
                          </div>
                          <div className="text-xs text-gray-500">
                            此 NFT 為靈魂綁定，無法一般轉讓
                          </div>
                        </>
                      )}
                    </div>
                    {selectedClaim.nftTokenId && (
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="btn btn-outline flex-1 border-amber-500 text-amber-400 hover:bg-amber-500/10"
                      >
                        🚨 緊急轉移 NFT
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* 緊急轉移 Modal */}
        {selectedClaim && (
          <EmergencyTransferModal
            isOpen={showTransferModal}
            onClose={() => setShowTransferModal(false)}
            nftId={selectedClaim.nftTokenId || ''}
            claimId={selectedClaim.id}
            onTransfer={handleEmergencyTransfer}
          />
        )}
      </div>
    </div>
  );
};
