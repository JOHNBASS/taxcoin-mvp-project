import { useState, useEffect } from 'react';
import exchangeService from '../services/exchange.service';
import type { LiquidityPool, SwapQuote } from '../types';

export const ExchangePage = () => {
  // 状态管理
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [inputToken, setInputToken] = useState<'SUI' | 'TAXCOIN'>('SUI');
  const [outputToken, setOutputToken] = useState<'SUI' | 'TAXCOIN'>('TAXCOIN');
  const [inputAmount, setInputAmount] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // 0.5%
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 加载流动性池信息
  useEffect(() => {
    loadPool();
  }, []);

  // 当输入金额改变时,重新计算报价
  useEffect(() => {
    if (inputAmount && parseFloat(inputAmount) > 0) {
      calculateQuote();
    } else {
      setQuote(null);
    }
  }, [inputAmount, inputToken, outputToken, slippageTolerance]);

  const loadPool = async () => {
    try {
      const poolData = await exchangeService.getPool();
      setPool(poolData);
    } catch (err) {
      console.error('Failed to load pool:', err);
    }
  };

  const calculateQuote = async () => {
    if (!pool || !inputAmount) return;

    try {
      const amount = parseFloat(inputAmount);
      if (amount <= 0) return;

      const inputReserve =
        inputToken === 'SUI' ? pool.suiReserve : pool.taxcoinReserve;
      const outputReserve =
        outputToken === 'SUI' ? pool.suiReserve : pool.taxcoinReserve;

      const parsedAmount = exchangeService.parseAmount(amount, inputToken);
      const { outputAmount, fee } = exchangeService.calculateOutputAmount(
        parsedAmount,
        inputReserve,
        outputReserve
      );

      const priceImpact = exchangeService.calculatePriceImpact(
        parsedAmount,
        inputReserve,
        outputReserve
      );

      const minimumReceived = exchangeService.calculateMinimumReceived(
        outputAmount,
        slippageTolerance
      );

      const exchangeRate = outputAmount / parsedAmount;

      setQuote({
        inputAmount: parsedAmount,
        outputAmount,
        priceImpact,
        minimumReceived,
        exchangeRate,
        fee,
      });
    } catch (err) {
      console.error('Failed to calculate quote:', err);
    }
  };

  const handleSwap = async () => {
    if (!pool || !quote || !inputAmount) return;

    setIsSwapping(true);
    setError('');
    setSuccess('');

    try {
      const result = await exchangeService.swap({
        inputToken,
        outputToken,
        inputAmount: quote.inputAmount,
        minOutputAmount: quote.minimumReceived,
        slippageTolerance,
      });

      setSuccess(
        `兑换成功! 获得 ${exchangeService.formatAmount(result.outputAmount, outputToken)} ${outputToken}`
      );
      setInputAmount('');
      setQuote(null);
      await loadPool(); // 重新加载池信息
    } catch (err) {
      setError(err instanceof Error ? err.message : '兑换失败');
    } finally {
      setIsSwapping(false);
    }
  };

  const switchTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount('');
    setQuote(null);
  };

  const setMaxAmount = () => {
    // 这里应该从钱包获取实际余额
    // 暂时设置一个示例值
    setInputAmount('1.0');
  };

  return (
    <div className="space-y-6">
      {/* 流动性池信息 */}
      {pool && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl shadow-xl shadow-cyan-500/20 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              流動性池資訊
            </h2>
            <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-bold shadow-lg shadow-green-500/30 animate-pulse">
              🟢 活躍中
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="backdrop-blur-xl bg-slate-900/50 rounded-xl p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <span className="text-white font-bold">S</span>
                </div>
                <p className="text-cyan-300 text-sm font-semibold">SUI 儲備</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {exchangeService.formatAmount(pool.suiReserve, 'SUI')}
              </p>
            </div>
            <div className="backdrop-blur-xl bg-slate-900/50 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white font-bold">T</span>
                </div>
                <p className="text-purple-300 text-sm font-semibold">TAXCOIN 儲備</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {exchangeService.formatAmount(pool.taxcoinReserve, 'TAXCOIN')}
              </p>
            </div>
            <div className="backdrop-blur-xl bg-slate-900/50 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <span className="text-white font-bold">$</span>
                </div>
                <p className="text-green-300 text-sm font-semibold">當前價格</p>
              </div>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                {pool.price.toFixed(2)} TAX/SUI
              </p>
            </div>
            <div className="backdrop-blur-xl bg-slate-900/50 rounded-xl p-4 border border-orange-500/20 hover:border-orange-500/40 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <span className="text-white font-bold">LP</span>
                </div>
                <p className="text-orange-300 text-sm font-semibold">LP 供應量</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {(pool.lpSupply / 1e9).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 兑换界面 */}
      <div className="backdrop-blur-xl bg-white/5 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 p-8">
        <h2 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-center">
          🔄 兌換代幣
        </h2>

        {/* 输入代币 */}
        <div className="mb-2">
          <label className="block text-sm font-bold text-cyan-300 mb-3">
            從
          </label>
          <div className="backdrop-blur-xl bg-slate-900/50 border-2 border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-500/50 transition-all">
            <div className="flex justify-between items-center mb-4">
              <select
                value={inputToken}
                onChange={(e) =>
                  setInputToken(e.target.value as 'SUI' | 'TAXCOIN')
                }
                className="text-2xl font-bold border-none focus:outline-none bg-transparent cursor-pointer text-white"
              >
                <option value="SUI">🔵 SUI</option>
                <option value="TAXCOIN">🟣 TAXCOIN</option>
              </select>
              <button
                onClick={setMaxAmount}
                className="px-5 py-2 text-sm font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 rounded-xl transition-all border border-cyan-500/30"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.0"
              className="w-full text-5xl font-bold border-none focus:outline-none bg-transparent text-white placeholder-gray-500"
              step="0.000000001"
              min="0"
            />
          </div>
        </div>

        {/* 切换按钮 */}
        <div className="flex justify-center my-6 relative z-10">
          <button
            onClick={switchTokens}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-full p-4 shadow-2xl shadow-purple-500/50 hover:shadow-cyan-500/50 transform hover:scale-110 hover:rotate-180 transition-all duration-300"
            title="切換代幣"
          >
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* 输出代币 */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-purple-300 mb-3">
            到
          </label>
          <div className="backdrop-blur-xl bg-slate-900/50 border-2 border-purple-500/30 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <select
                value={outputToken}
                onChange={(e) =>
                  setOutputToken(e.target.value as 'SUI' | 'TAXCOIN')
                }
                className="text-2xl font-bold border-none focus:outline-none bg-transparent cursor-pointer text-white"
              >
                <option value="SUI">🔵 SUI</option>
                <option value="TAXCOIN">🟣 TAXCOIN</option>
              </select>
            </div>
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {quote
                ? exchangeService.formatAmount(quote.outputAmount, outputToken)
                : '0.0'}
            </div>
          </div>
        </div>

        {/* 兑换详情 */}
        {quote && (
          <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-cyan-200 mb-4 flex items-center gap-2 text-lg">
              <span className="text-2xl">📊</span>
              兌換詳情
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                <span className="text-gray-300 font-semibold">匯率</span>
                <span className="font-bold text-white">
                  1 {inputToken} ≈{' '}
                  {(quote.exchangeRate * (inputToken === 'SUI' ? 1e9 : 1e8)).toFixed(4)}{' '}
                  {outputToken}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                <span className="text-gray-300 font-semibold">價格影響</span>
                <span
                  className={`font-bold ${
                    quote.priceImpact > 5
                      ? 'text-red-400'
                      : quote.priceImpact > 2
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                <span className="text-gray-300 font-semibold">手續費 (0.3%)</span>
                <span className="font-bold text-white">
                  {exchangeService.formatAmount(quote.fee, inputToken)} {inputToken}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                <span className="text-gray-300 font-semibold">
                  最小接收 (滑點 {slippageTolerance}%)
                </span>
                <span className="font-bold text-cyan-400">
                  {exchangeService.formatAmount(
                    quote.minimumReceived,
                    outputToken
                  )}{' '}
                  {outputToken}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 滑点设置 */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-purple-300 mb-3">
            ⚙️ 滑點容忍度
          </label>
          <div className="flex gap-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <button
                key={value}
                onClick={() => setSlippageTolerance(value)}
                className={`flex-1 px-5 py-3 rounded-xl font-bold transition-all ${
                  slippageTolerance === value
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-slate-900/50 text-gray-300 hover:bg-slate-800/50 border border-gray-600/30'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
              className="w-28 px-4 py-3 bg-slate-900/50 border border-purple-500/30 rounded-xl focus:border-purple-500 focus:outline-none text-center font-bold text-white"
              step="0.1"
              min="0.1"
              max="50"
            />
          </div>
        </div>

        {/* 错误和成功消息 */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/50 text-red-300 px-6 py-4 rounded-2xl mb-4 flex items-start gap-3 shadow-lg shadow-red-500/20">
            <span className="text-2xl">❌</span>
            <div className="flex-1 font-semibold">{error}</div>
          </div>
        )}

        {success && (
          <div className="backdrop-blur-xl bg-green-500/10 border border-green-500/50 text-green-300 px-6 py-4 rounded-2xl mb-4 flex items-start gap-3 shadow-lg shadow-green-500/20">
            <span className="text-2xl">✅</span>
            <div className="flex-1 font-semibold">{success}</div>
          </div>
        )}

        {/* 兑换按钮 */}
        <button
          onClick={handleSwap}
          disabled={!quote || isSwapping || !inputAmount}
          className={`w-full py-5 rounded-2xl font-bold text-xl transition-all transform ${
            !quote || isSwapping || !inputAmount
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 shadow-2xl shadow-purple-500/50 hover:shadow-cyan-500/50 hover:scale-[1.02]'
          }`}
        >
          {isSwapping ? '⏳ 兌換中...' : '🔄 立即兌換'}
        </button>

        {/* 警告信息 */}
        {quote && quote.priceImpact > 5 && (
          <div className="mt-6 backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 px-6 py-4 rounded-2xl shadow-lg shadow-yellow-500/20">
            <p className="font-bold flex items-center gap-2 mb-2 text-lg">
              <span className="text-2xl">⚠️</span>
              高價格影響警告
            </p>
            <p className="text-sm">
              此交易將顯著影響池子價格 ({quote.priceImpact.toFixed(2)}%)。
              建議分批交易或增加滑點容忍度。
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default ExchangePage;
