import React, { useState } from 'react';

interface InfoRowProps {
  label: string;
  value: string;
  copyable?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (copyable) {
      navigator.clipboard.writeText(copyable);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition"
            title="複製完整地址"
          >
            {copied ? '✓' : '📋'}
          </button>
        )}
      </div>
    </div>
  );
};

export default InfoRow;
