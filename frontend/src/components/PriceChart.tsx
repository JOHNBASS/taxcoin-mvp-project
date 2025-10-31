import { useEffect, useState } from 'react';
import exchangeService from '../services/exchange.service';
import type { PriceHistory } from '../types';

interface PriceChartProps {
  period?: '1h' | '24h' | '7d' | '30d';
}

export const PriceChart: React.FC<PriceChartProps> = ({ period = '24h' }) => {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d' | '30d'>(period);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadPriceHistory();
  }, [selectedPeriod]);

  const loadPriceHistory = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await exchangeService.getPriceHistory(selectedPeriod);
      setPriceHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePriceChange = (): { change: number; percentage: number } => {
    if (priceHistory.length < 2) return { change: 0, percentage: 0 };

    const latest = priceHistory[priceHistory.length - 1];
    const earliest = priceHistory[0];
    const change = latest.price - earliest.price;
    const percentage = (change / earliest.price) * 100;

    return { change, percentage };
  };

  const getChartPoints = (): string => {
    if (priceHistory.length === 0) return '';

    const width = 800;
    const height = 300;
    const padding = 40;

    const prices = priceHistory.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const points = priceHistory
      .map((item, index) => {
        const x = padding + (index / (priceHistory.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((item.price - minPrice) / priceRange) * (height - 2 * padding);
        return `${x},${y}`;
      })
      .join(' ');

    return points;
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    if (selectedPeriod === '1h') {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (selectedPeriod === '24h') {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  const { change, percentage } = calculatePriceChange();
  const isPositive = change >= 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (priceHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">价格走势</h2>
        <div className="text-center text-gray-500 py-12">
          <p>暂无价格数据</p>
          <p className="text-sm mt-2">流动性池尚未初始化</p>
        </div>
      </div>
    );
  }

  const latestPrice = priceHistory[priceHistory.length - 1]?.price || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold mb-2">价格走势</h2>
          <div className="text-3xl font-bold">{latestPrice.toFixed(4)} TAX/SUI</div>
          <div
            className={`text-sm font-medium mt-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(4)} (
            {isPositive ? '+' : ''}
            {percentage.toFixed(2)}%)
          </div>
        </div>

        {/* 时间周期选择 */}
        <div className="flex gap-2">
          {(['1h', '24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG 图表 */}
      <div className="relative">
        <svg
          viewBox="0 0 800 300"
          className="w-full h-64"
          style={{ minHeight: '300px' }}
        >
          {/* 背景网格 */}
          <g className="text-gray-200">
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1="40"
                y1={40 + i * 55}
                x2="760"
                y2={40 + i * 55}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="4"
              />
            ))}
          </g>

          {/* 价格线 */}
          <polyline
            points={getChartPoints()}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 渐变填充 */}
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0.2"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <polygon
            points={`40,260 ${getChartPoints()} 760,260`}
            fill="url(#priceGradient)"
          />

          {/* 数据点 */}
          {priceHistory.map((item, index) => {
            const width = 800;
            const height = 300;
            const padding = 40;
            const prices = priceHistory.map((p) => p.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const priceRange = maxPrice - minPrice || 1;

            const x =
              padding + (index / (priceHistory.length - 1)) * (width - 2 * padding);
            const y =
              height -
              padding -
              ((item.price - minPrice) / priceRange) * (height - 2 * padding);

            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={isPositive ? '#10b981' : '#ef4444'}
                  className="hover:r-5 transition-all cursor-pointer"
                >
                  <title>
                    {formatTime(item.timestamp)}: {item.price.toFixed(4)} TAX/SUI
                  </title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 底部时间轴 */}
      <div className="flex justify-between text-xs text-gray-500 mt-2 px-10">
        {priceHistory.length > 0 && (
          <>
            <span>{formatTime(priceHistory[0].timestamp)}</span>
            {priceHistory.length > 2 && (
              <span>
                {formatTime(priceHistory[Math.floor(priceHistory.length / 2)].timestamp)}
              </span>
            )}
            <span>
              {formatTime(priceHistory[priceHistory.length - 1].timestamp)}
            </span>
          </>
        )}
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
        <div>
          <p className="text-gray-600 text-sm">24h 最高</p>
          <p className="text-lg font-semibold">
            {Math.max(...priceHistory.map((p) => p.price)).toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">24h 最低</p>
          <p className="text-lg font-semibold">
            {Math.min(...priceHistory.map((p) => p.price)).toFixed(4)}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">24h 交易量</p>
          <p className="text-lg font-semibold">
            {(priceHistory[priceHistory.length - 1]?.volume24h || 0).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-sm">数据点</p>
          <p className="text-lg font-semibold">{priceHistory.length}</p>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;
