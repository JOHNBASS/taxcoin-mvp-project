import React, { useState } from 'react';

interface EmergencyTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  nftId: string;
  claimId: string;
  onTransfer: (newOwner: string, reason: string) => Promise<void>;
}

const EmergencyTransferModal: React.FC<EmergencyTransferModalProps> = ({
  isOpen,
  onClose,
  nftId,
  claimId,
  onTransfer,
}) => {
  const [newOwner, setNewOwner] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // 驗證輸入
    if (!newOwner.trim()) {
      setError('請輸入新持有者地址');
      return;
    }

    if (!reason.trim()) {
      setError('請輸入轉移原因');
      return;
    }

    // 驗證地址格式 (Sui 地址應為 0x 開頭，66 字符)
    if (!newOwner.startsWith('0x') || newOwner.length !== 66) {
      setError('請輸入有效的 Sui 錢包地址（以 0x 開頭，66 字符）');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onTransfer(newOwner, reason);
      // 成功後清空表單並關閉對話框
      setNewOwner('');
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '轉移失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewOwner('');
      setReason('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        {/* 標題 */}
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>🚨</span>
          緊急轉移 NFT
        </h2>

        {/* 警告 */}
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-md">
          <p className="text-sm text-red-400 font-medium">
            ⚠️ 注意：此操作將永久轉移靈魂綁定的 NFT
          </p>
          <p className="text-xs text-red-300/70 mt-1">
            只應在特殊情況下使用（如用戶錢包遺失）
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* 表單 */}
        <div className="space-y-4">
          {/* 新持有者地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              新持有者地址 *
            </label>
            <input
              type="text"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              請輸入完整的 Sui 錢包地址（66 字符）
            </p>
          </div>

          {/* 轉移原因 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              轉移原因 *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請詳細說明轉移原因（如：用戶錢包遺失並提供新地址）"
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* NFT 資訊 */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-md">
            <p className="text-xs text-gray-400 mb-1">申請 ID:</p>
            <p className="text-sm font-mono text-gray-300">{claimId}</p>

            {nftId && (
              <>
                <p className="text-xs text-gray-400 mt-2 mb-1">NFT Object ID:</p>
                <p className="text-sm font-mono text-gray-300 break-all">{nftId}</p>
              </>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !newOwner || !reason}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '處理中...' : '確認轉移'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyTransferModal;
