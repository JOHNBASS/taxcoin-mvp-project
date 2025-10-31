import { useState } from 'react';
import ExchangePage from './ExchangePage';
import PriceChart from '../components/PriceChart';

/**
 * 完整的兑换页面 - Web3 風格
 * - 价格图表
 * - 兑换界面
 * - 流动性管理
 */
export const ExchangeFullPage = () => {
  const [activeTab, setActiveTab] = useState<'swap' | 'liquidity'>('swap');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* 页面标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            SUI ↔ TAXCOIN Exchange
          </h1>
          <p className="text-cyan-100 text-lg">
            🌐 去中心化兑换平台 | 💎 1 TAXCOIN = 1 TWD
          </p>
        </div>

        {/* 价格图表 */}
        <div className="mb-6">
          <PriceChart period="24h" />
        </div>

        {/* Tab 切换 */}
        <div className="backdrop-blur-xl bg-white/10 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
          <div className="border-b border-purple-500/30 bg-gradient-to-r from-slate-900/50 to-purple-900/50">
            <div className="flex">
              <button
                onClick={() => setActiveTab('swap')}
                className={`px-8 py-5 font-bold text-lg transition-all ${
                  activeTab === 'swap'
                    ? 'text-cyan-300 border-b-4 border-cyan-500 bg-cyan-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                🔄 兑换
              </button>
              <button
                onClick={() => setActiveTab('liquidity')}
                className={`px-8 py-5 font-bold text-lg transition-all ${
                  activeTab === 'liquidity'
                    ? 'text-purple-300 border-b-4 border-purple-500 bg-purple-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                }`}
              >
                💧 流动性
              </button>
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'swap' ? (
              <SwapSection />
            ) : (
              <LiquiditySection />
            )}
          </div>
        </div>

        {/* 帮助说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl p-6 shadow-lg shadow-cyan-500/20">
            <h3 className="font-bold text-cyan-200 mb-4 flex items-center gap-2 text-lg">
              <span className="text-2xl">💱</span>
              关于兑换
            </h3>
            <ul className="text-sm text-cyan-100 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>基于 AMM (自动做市商) 机制</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>使用恒定乘积公式 (x × y = k)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>0.3% 交易手续费</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>支持滑点保护</span>
              </li>
            </ul>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 shadow-lg shadow-green-500/20">
            <h3 className="font-bold text-green-200 mb-4 flex items-center gap-2 text-lg">
              <span className="text-2xl">💰</span>
              关于流动性
            </h3>
            <ul className="text-sm text-green-100 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>提供流动性可获得 LP Token</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>赚取交易手续费收益</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>随时可以移除流动性</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>注意无常损失风险</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 兑换区块
 */
const SwapSection = () => {
  return <ExchangePage />;
};

/**
 * 流动性管理区块
 */
const LiquiditySection = () => {
  const [isAddMode, setIsAddMode] = useState(true);

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border-2 border-purple-500/30 p-1.5 backdrop-blur-xl bg-slate-900/50">
          <button
            onClick={() => setIsAddMode(true)}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              isAddMode
                ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            ➕ 添加流动性
          </button>
          <button
            onClick={() => setIsAddMode(false)}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${
              !isAddMode
                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/30'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            ➖ 移除流动性
          </button>
        </div>
      </div>

      {isAddMode ? <AddLiquidityForm /> : <RemoveLiquidityForm />}
    </div>
  );
};

/**
 * 添加流动性表单
 */
const AddLiquidityForm = () => {
  const [suiAmount, setSuiAmount] = useState('');
  const [taxcoinAmount, setTaxcoinAmount] = useState('');

  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6 text-center">
        添加流动性
      </h3>

      <div className="space-y-4">
        {/* SUI 输入 */}
        <div>
          <label className="block text-sm font-semibold text-cyan-300 mb-2">
            SUI 数量
          </label>
          <div className="backdrop-blur-xl bg-slate-900/50 border border-cyan-500/30 rounded-xl p-5 hover:border-cyan-500/50 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-white">🔵 SUI</span>
              <button className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold">
                余额: 0.00
              </button>
            </div>
            <input
              type="number"
              value={suiAmount}
              onChange={(e) => setSuiAmount(e.target.value)}
              placeholder="0.0"
              className="w-full text-3xl font-bold border-none focus:outline-none bg-transparent text-white placeholder-gray-500"
              step="0.000000001"
            />
          </div>
        </div>

        {/* 加号 */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-3 shadow-lg shadow-purple-500/50">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
        </div>

        {/* TAXCOIN 输入 */}
        <div>
          <label className="block text-sm font-semibold text-purple-300 mb-2">
            TAXCOIN 数量
          </label>
          <div className="backdrop-blur-xl bg-slate-900/50 border border-purple-500/30 rounded-xl p-5 hover:border-purple-500/50 transition-all">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xl font-bold text-white">🟣 TAXCOIN</span>
              <button className="text-sm text-purple-400 hover:text-purple-300 font-semibold">
                余额: 0.00
              </button>
            </div>
            <input
              type="number"
              value={taxcoinAmount}
              onChange={(e) => setTaxcoinAmount(e.target.value)}
              placeholder="0.0"
              className="w-full text-3xl font-bold border-none focus:outline-none bg-transparent text-white placeholder-gray-500"
              step="0.00000001"
            />
          </div>
        </div>

        {/* 预估信息 */}
        {suiAmount && taxcoinAmount && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5">
            <h4 className="font-bold text-cyan-200 mb-3">📊 预估</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-slate-900/30 rounded-lg">
                <span className="text-gray-300">初始价格</span>
                <span className="font-bold text-white">
                  {(parseFloat(taxcoinAmount) / parseFloat(suiAmount)).toFixed(4)} TAX/SUI
                </span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/30 rounded-lg">
                <span className="text-gray-300">池占比</span>
                <span className="font-bold text-cyan-300">100%</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-900/30 rounded-lg">
                <span className="text-gray-300">LP Token</span>
                <span className="font-bold text-purple-300">~估算中</span>
              </div>
            </div>
          </div>
        )}

        <button
          disabled={!suiAmount || !taxcoinAmount}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            !suiAmount || !taxcoinAmount
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transform hover:scale-[1.02]'
          }`}
        >
          ➕ 添加流动性
        </button>
      </div>

      <div className="mt-6 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-5 py-4 rounded-xl text-sm shadow-lg shadow-yellow-500/20">
        <p className="font-bold flex items-center gap-2 mb-2">
          <span className="text-xl">⚠️</span>
          注意事项
        </p>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>添加流动性需要同时提供 SUI 和 TAXCOIN</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>比例将决定初始价格</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>您将获得代表份额的 LP Token NFT</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>存在无常损失风险</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

/**
 * 移除流动性表单
 */
const RemoveLiquidityForm = () => {
  const [removePercentage, setRemovePercentage] = useState(50);

  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400 mb-6 text-center">
        移除流动性
      </h3>

      <div className="space-y-6">
        {/* 移除比例选择 */}
        <div>
          <label className="block text-sm font-semibold text-purple-300 mb-3">
            移除比例: <span className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">{removePercentage}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={removePercentage}
            onChange={(e) => setRemovePercentage(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-900/50 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="flex justify-between mt-4 gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setRemovePercentage(pct)}
                className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                  removePercentage === pct
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-slate-900/50 text-gray-300 hover:bg-slate-800/50 border border-gray-600/30'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 预估获得 */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-5">
          <h4 className="font-bold text-purple-200 mb-4 flex items-center gap-2">
            <span className="text-xl">💎</span>
            您将获得
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-lg">
              <span className="text-gray-300 font-semibold">🔵 SUI</span>
              <span className="text-2xl font-bold text-cyan-300">0.00</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/30 rounded-lg">
              <span className="text-gray-300 font-semibold">🟣 TAXCOIN</span>
              <span className="text-2xl font-bold text-purple-300">0.00</span>
            </div>
          </div>
        </div>

        <button
          disabled={removePercentage === 0}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            removePercentage === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-red-500 to-pink-600 text-white hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/60 transform hover:scale-[1.02]'
          }`}
        >
          ➖ 移除流动性
        </button>
      </div>

      <div className="mt-6 backdrop-blur-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 px-5 py-4 rounded-xl text-sm shadow-lg shadow-cyan-500/20">
        <p className="font-bold flex items-center gap-2 mb-2">
          <span className="text-xl">💡</span>
          提示
        </p>
        <p>
          移除流动性后,您的 LP Token 将被销毁,并按比例获得池中的 SUI 和 TAXCOIN。
        </p>
      </div>
    </div>
  );
};

export default ExchangeFullPage;
