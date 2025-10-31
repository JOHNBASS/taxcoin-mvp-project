import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import taxClaimService from '../services/taxClaim.service';
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

export const TaxClaimDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [claim, setClaim] = useState<TaxClaim | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadClaim = async () => {
      if (!id) return;

      setIsLoading(true);
      setError('');

      try {
        const response = await taxClaimService.getClaimById(id);
        setClaim(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : '載入失敗');
      } finally {
        setIsLoading(false);
      }
    };

    loadClaim();
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error || !claim) {
    return (
      <div className="container-responsive py-8">
        <div className="card p-6 bg-red-500/10 border-red-500/50">
          <p className="text-red-400">{error || '找不到退稅申請'}</p>
          <button onClick={() => navigate('/tax-claims')} className="btn btn-primary mt-4">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <button
          onClick={() => navigate('/tax-claims')}
          className="btn btn-secondary mb-6"
        >
          ← 返回列表
        </button>

        {/* 標題 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">退稅申請詳情</h1>
            <span
              className={`
                px-4 py-2 rounded-full text-sm font-semibold
                ${statusConfig[claim.status].color}
                ${statusConfig[claim.status].bgColor}
              `}
            >
              {statusConfig[claim.status].label}
            </span>
          </div>
        </div>

        {/* 申請資訊卡片 */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">申請資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-gray-400 text-sm">申請編號</span>
              <p className="font-mono font-semibold">{claim.id}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">申請日期</span>
              <p className="font-semibold">{formatDate(claim.createdAt)}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">總金額</span>
              <p className="font-semibold text-primary-400 text-2xl">
                NT$ {(claim.totalAmount || (claim as any).originalAmount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">退稅金額</span>
              <p className="font-semibold text-accent-400 text-2xl">
                NT$ {(claim.taxAmount || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* OCR 結果 */}
        {claim.ocrResult && typeof claim.ocrResult === 'object' && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">收據資訊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(claim.ocrResult as any).merchantName && (
                <div>
                  <span className="text-gray-400 text-sm">商家名稱</span>
                  <p className="font-semibold">{(claim.ocrResult as any).merchantName}</p>
                </div>
              )}
              {(claim.ocrResult as any).purchaseDate && (
                <div>
                  <span className="text-gray-400 text-sm">購買日期</span>
                  <p className="font-semibold">{(claim.ocrResult as any).purchaseDate}</p>
                </div>
              )}
              {(claim.ocrResult as any).totalAmount && (
                <div>
                  <span className="text-gray-400 text-sm">收據總金額</span>
                  <p className="font-semibold">NT$ {Number((claim.ocrResult as any).totalAmount || 0).toLocaleString()}</p>
                </div>
              )}
              {(claim.ocrResult as any).confidence !== undefined && (
                <div>
                  <span className="text-gray-400 text-sm">識別信心度</span>
                  <p className="font-semibold">{(Number((claim.ocrResult as any).confidence || 0) * 100).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 收據圖片 */}
        {claim.receiptImages && claim.receiptImages.length > 0 && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">收據圖片 ({claim.receiptImages.length} 張)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {claim.receiptImages.map((image, index) => {
                // Backend serves images at /uploads which nginx proxies to backend:3000/uploads
                // Image paths from backend are like "/uploads/receipts/filename.jpg"
                const imageUrl = image.startsWith('http') ? image : image;
                return (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`收據 ${index + 1}`}
                      className="w-full rounded-lg border border-gray-700 hover:border-primary-500 transition-colors"
                      onError={(e) => {
                        console.error(`Failed to load image: ${imageUrl}`);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <a
                      href={imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 btn btn-sm btn-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      查看大圖
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 審核資訊 */}
        {(claim.reviewNotes || claim.status !== 'PENDING') && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">審核資訊</h2>
            <div className="space-y-4">
              {claim.reviewNotes && (
                <div>
                  <span className="text-gray-400 text-sm">審核備註</span>
                  <p className="mt-1 p-3 rounded-lg bg-gray-800/50">{claim.reviewNotes}</p>
                </div>
              )}
              {claim.status === 'REJECTED' && claim.reviewNotes && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                  <span className="text-red-400 font-semibold">拒絕原因：</span>
                  <p className="text-red-300 mt-1">{claim.reviewNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NFT 和交易資訊 */}
        {(claim.nftTokenId || claim.txHash) && (
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">區塊鏈資訊</h2>
            <div className="space-y-4">
              {claim.nftTokenId && (
                <div>
                  <span className="text-gray-400 text-sm">NFT Token ID</span>
                  <p className="mt-1 font-mono text-sm bg-gray-800 p-3 rounded-lg break-all">
                    {claim.nftTokenId}
                  </p>
                </div>
              )}
              {claim.txHash && (
                <div>
                  <span className="text-gray-400 text-sm">交易雜湊</span>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-sm bg-gray-800 p-3 rounded-lg break-all flex-1">
                      {claim.txHash}
                    </p>
                    <a
                      href={`https://suiexplorer.com/txblock/${claim.txHash}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary whitespace-nowrap"
                    >
                      在 Sui Explorer 查看
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
