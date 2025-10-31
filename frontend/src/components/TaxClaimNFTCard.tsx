import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import InfoRow from './InfoRow';

interface TaxClaimNFT {
  id: string;
  claim_id?: string;
  original_owner?: string;
  is_soulbound?: boolean;
  status: number;
  tax_amount?: number;
  merchant_name?: string;
  created_at?: number;
  nftTokenId?: string;
}

interface TaxClaimNFTCardProps {
  nft: TaxClaimNFT;
  currentUserAddress?: string;
  showTransferButton?: boolean;
}

const TaxClaimNFTCard: React.FC<TaxClaimNFTCardProps> = ({
  nft,
  currentUserAddress,
  showTransferButton = false
}) => {
  const navigate = useNavigate();
  const isSoulbound = nft.is_soulbound ?? true; // 預設為靈魂綁定
  const isOriginalOwner = nft.original_owner === currentUserAddress;

  const handleViewDetails = () => {
    navigate(`/tax-claims/${nft.id}`);
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition">
      {/* 頂部標題區 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          退稅證明 NFT #{nft.claim_id || nft.id.slice(0, 8)}
          {isSoulbound && (
            <span className="text-2xl" title="靈魂綁定，不可轉讓">
              🔒
            </span>
          )}
        </h3>
        <StatusBadge status={nft.status} />
      </div>

      {/* 靈魂綁定提示 */}
      {isSoulbound && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 text-xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                靈魂綁定 NFT
              </p>
              <p className="text-xs text-blue-700 mt-1">
                此 NFT 永久綁定至原始持有者，無法轉讓或交易
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 持有者驗證（如果不是原始持有者） */}
      {isSoulbound && currentUserAddress && !isOriginalOwner && nft.original_owner && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                持有者不匹配
              </p>
              <p className="text-xs text-amber-700 mt-1">
                您當前的錢包地址與 NFT 原始持有者不符
              </p>
              <p className="text-xs text-amber-600 mt-1">
                原始持有者: {nft.original_owner.slice(0, 8)}...{nft.original_owner.slice(-6)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NFT 詳細資訊 */}
      <div className="space-y-3">
        {nft.tax_amount !== undefined && (
          <InfoRow label="退稅金額" value={`${(nft.tax_amount / 100).toFixed(2)} TWD`} />
        )}

        {nft.merchant_name && (
          <InfoRow label="商家名稱" value={nft.merchant_name} />
        )}

        {nft.original_owner && (
          <InfoRow
            label="原始持有者"
            value={`${nft.original_owner.slice(0, 8)}...${nft.original_owner.slice(-6)}`}
            copyable={nft.original_owner}
          />
        )}

        {nft.created_at && (
          <InfoRow
            label="創建時間"
            value={new Date(nft.created_at).toLocaleString('zh-TW')}
          />
        )}

        {nft.nftTokenId && (
          <InfoRow
            label="NFT Object ID"
            value={`${nft.nftTokenId.slice(0, 8)}...${nft.nftTokenId.slice(-6)}`}
            copyable={nft.nftTokenId}
          />
        )}
      </div>

      {/* 操作按鈕區 */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleViewDetails}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          查看詳情
        </button>

        {/* 靈魂綁定的 NFT 不顯示轉讓按鈕 */}
        {!isSoulbound && showTransferButton && (
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
            onClick={() => alert('轉讓功能開發中')}
          >
            轉讓 NFT
          </button>
        )}
      </div>
    </div>
  );
};

export default TaxClaimNFTCard;
