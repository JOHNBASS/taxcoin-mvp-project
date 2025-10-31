import { useState, useEffect } from 'react';
import kycService from '../services/kyc.service';
import type { KycRecord } from '../types';
import { CredentialVerifier } from '../components/CredentialVerifier';

export const AdminKycPage = () => {
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  useEffect(() => {
    loadKycRecords();
  }, [page, selectedStatus]);

  const loadKycRecords = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await kycService.getAllKyc({
        page,
        limit: 10,
        status: selectedStatus || undefined,
      });

      setKycRecords(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      setReviewingId(id);
      await kycService.reviewKyc(id, {
        action,
        notes: reviewNotes || undefined,
      });

      // 重新載入列表
      await loadKycRecords();
      setReviewNotes('');
      setReviewingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '審核失敗');
      setReviewingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="badge badge-warning">待審核</span>;
      case 'VERIFIED':
        return <span className="badge badge-success">已通過</span>;
      case 'REJECTED':
        return <span className="badge badge-error">已拒絕</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">KYC 審核管理</h1>
          <p className="text-gray-400">審核和管理用戶的 KYC 驗證申請</p>
        </div>

        {/* 篩選器 */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedStatus('')}
              className={`btn btn-sm ${
                selectedStatus === '' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSelectedStatus('PENDING')}
              className={`btn btn-sm ${
                selectedStatus === 'PENDING' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              待審核
            </button>
            <button
              onClick={() => setSelectedStatus('VERIFIED')}
              className={`btn btn-sm ${
                selectedStatus === 'VERIFIED' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              已通過
            </button>
            <button
              onClick={() => setSelectedStatus('REJECTED')}
              className={`btn btn-sm ${
                selectedStatus === 'REJECTED' ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              已拒絕
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

        {/* 錯誤訊息 */}
        {error && !isLoading && (
          <div className="card p-6 bg-red-500/10 border-red-500/50 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 空狀態 */}
        {!isLoading && !error && kycRecords.length === 0 && (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">無 KYC 記錄</h3>
            <p className="text-gray-400">目前沒有符合條件的 KYC 申請</p>
          </div>
        )}

        {/* KYC 列表 */}
        {!isLoading && !error && kycRecords.length > 0 && (
          <div className="space-y-4">
            {kycRecords.map((record) => (
              <div
                key={record.id}
                className="card hover:shadow-glow transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* 左側：圖片 */}
                  <div className="flex gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">護照照片</p>
                      <img
                        src={record.passportImageUrl}
                        alt="護照"
                        className="w-48 h-32 object-cover rounded-lg border border-gray-700"
                        onError={(e) => {
                          console.error('Failed to load passport image:', record.passportImageUrl);
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23374151" width="200" height="150"/%3E%3Ctext fill="%239CA3AF" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E載入失敗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <p className="text-xs text-gray-500 break-all">{record.passportImageUrl}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">自拍照片</p>
                      <img
                        src={record.faceImageUrl}
                        alt="自拍"
                        className="w-48 h-32 object-cover rounded-lg border border-gray-700"
                        onError={(e) => {
                          console.error('Failed to load face image:', record.faceImageUrl);
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23374151" width="200" height="150"/%3E%3Ctext fill="%239CA3AF" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E載入失敗%3C/text%3E%3C/svg%3E';
                        }}
                      />
                      <p className="text-xs text-gray-500 break-all">{record.faceImageUrl}</p>
                    </div>
                  </div>

                  {/* 右側：資訊 */}
                  <div className="flex-1 space-y-4">
                    {/* 狀態和 ID */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        KYC #{record.id.slice(0, 8)}
                      </h3>
                      {getStatusBadge(record.status)}
                    </div>

                    {/* 基本資訊 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">姓名</span>
                        <p className="font-semibold">{record.fullName}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">護照號碼</span>
                        <p className="font-semibold font-mono">
                          {record.passportNumber}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">國籍</span>
                        <p className="font-semibold">{record.passportCountry}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">護照到期日</span>
                        <p className="font-semibold">
                          {new Date(record.passportExpiry).toLocaleDateString(
                            'zh-TW'
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">申請時間</span>
                        <p className="font-semibold">{formatDate(record.createdAt)}</p>
                      </div>
                      {record.faceMatchScore !== undefined && (
                        <div>
                          <span className="text-gray-400">臉部比對分數</span>
                          <p className="font-semibold text-primary-400">
                            {(record.faceMatchScore * 100).toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* OCR 資料 */}
                    {record.ocrData && (
                      <div className="p-3 rounded-lg bg-gray-800/50">
                        <p className="text-xs text-gray-400 mb-2">OCR 識別資料</p>
                        <pre className="text-xs font-mono text-gray-300 overflow-x-auto">
                          {JSON.stringify(record.ocrData, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* ✅ 新增: 可驗證憑證資訊 (僅已驗證) */}
                    {record.status === 'VERIFIED' && record.credentialId && (
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">🔐</span>
                          <h4 className="text-sm font-semibold">可驗證憑證資訊</h4>
                        </div>

                        <div className="space-y-2 text-sm mb-3">
                          <div className="flex gap-2">
                            <span className="text-gray-500 min-w-[100px]">憑證 ID:</span>
                            <span className="font-mono text-purple-300 break-all flex-1">
                              {record.credentialId}
                            </span>
                          </div>

                          {record.issuerDID && (
                            <div className="flex gap-2">
                              <span className="text-gray-500 min-w-[100px]">簽發者 DID:</span>
                              <span className="font-mono text-blue-300 break-all flex-1">
                                {record.issuerDID}
                              </span>
                            </div>
                          )}

                          {record.didDocumentHash && (
                            <div className="flex gap-2">
                              <span className="text-gray-500 min-w-[100px]">鏈上 Hash:</span>
                              <span className="font-mono text-green-300 break-all flex-1">
                                {record.didDocumentHash}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 憑證驗證組件 */}
                        <CredentialVerifier
                          credential={record.verifiableCredential}
                          credentialId={record.credentialId}
                        />
                      </div>
                    )}

                    {/* 審核備註 */}
                    {record.reviewNotes && (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/50">
                        <p className="text-xs text-gray-400 mb-1">審核備註</p>
                        <p className="text-sm">{record.reviewNotes}</p>
                      </div>
                    )}

                    {/* 審核操作 (僅 PENDING 狀態) */}
                    {record.status === 'PENDING' && (
                      <div className="space-y-3 pt-4 border-t border-gray-800">
                        <textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="審核備註 (選填)"
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-primary-500 text-sm"
                          rows={2}
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReview(record.id, 'approve')}
                            disabled={reviewingId === record.id}
                            className="btn btn-success btn-sm"
                          >
                            {reviewingId === record.id ? '處理中...' : '通過'}
                          </button>
                          <button
                            onClick={() => handleReview(record.id, 'reject')}
                            disabled={reviewingId === record.id}
                            className="btn btn-error btn-sm"
                          >
                            {reviewingId === record.id ? '處理中...' : '拒絕'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 已審核資訊 */}
                    {record.verifiedAt && (
                      <div className="text-sm text-gray-400">
                        審核時間: {formatDate(record.verifiedAt)}
                      </div>
                    )}
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`btn btn-sm ${
                      pageNum === page ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
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
