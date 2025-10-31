import React from 'react';

interface StatusBadgeProps {
  status: number;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    0: { label: '待審核', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    1: { label: '已核准', color: 'bg-green-100 text-green-800', icon: '✓' },
    2: { label: '已拒絕', color: 'bg-red-100 text-red-800', icon: '✗' },
    3: { label: '已發放', color: 'bg-blue-100 text-blue-800', icon: '💰' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig[0];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

export default StatusBadge;
