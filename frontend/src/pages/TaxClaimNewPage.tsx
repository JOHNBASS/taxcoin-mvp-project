import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReceiptUpload } from '../components/ReceiptUpload';
import taxClaimService from '../services/taxClaim.service';
import type { TaxClaim, OcrResult } from '../types';

export const TaxClaimNewPage = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [claim, setClaim] = useState<TaxClaim | null>(null);
  const [step, setStep] = useState<'upload' | 'result' | 'success'>('upload');
  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai'); // 輸入模式選擇

  // 手动输入的字段
  const [manualMerchantName, setManualMerchantName] = useState('');
  const [manualPurchaseDate, setManualPurchaseDate] = useState('');
  const [manualTotalAmount, setManualTotalAmount] = useState('');
  const [manualEntryFlight, setManualEntryFlight] = useState('');
  const [manualEntryFlightDate, setManualEntryFlightDate] = useState('');
  const [manualExitFlight, setManualExitFlight] = useState('');
  const [manualExitFlightDate, setManualExitFlightDate] = useState('');

  /**
   * 提交收據(自动 OCR)
   */
  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('請至少上傳一張收據');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await taxClaimService.createClaim({ receipts: files });
      setClaim(result);
      setOcrResult(result.ocrResult || null);
      setStep('result');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上傳失敗,請稍後再試';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 提交手动输入的数据
   */
  const handleManualSubmit = async () => {
    // 验证必填字段
    if (!manualMerchantName || !manualPurchaseDate || !manualTotalAmount ||
        !manualEntryFlight || !manualEntryFlightDate ||
        !manualExitFlight || !manualExitFlightDate) {
      setError('请填写所有必填字段');
      return;
    }

    const amount = parseFloat(manualTotalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('请输入有效的金额');
      return;
    }

    if (amount < 2000) {
      setError('消费金额必须大于 NT$ 2,000 才能申请退税');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await taxClaimService.createClaim({
        receipts: files,
        manualData: {
          merchantName: manualMerchantName,
          purchaseDate: manualPurchaseDate,
          totalAmount: amount,
          entryFlight: manualEntryFlight,
          entryFlightDate: manualEntryFlightDate,
          exitFlight: manualExitFlight,
          exitFlightDate: manualExitFlightDate
        }
      });
      setClaim(result);
      setOcrResult({
        merchantName: manualMerchantName,
        purchaseDate: manualPurchaseDate,
        totalAmount: amount,
        items: [],
        confidence: 1.0 // 手动输入,信心度为 100%
      });
      setStep('result');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '提交失敗,請稍後再試';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 確認並完成
   */
  const handleConfirm = () => {
    setStep('success');
    // 3 秒後跳轉到列表頁
    setTimeout(() => {
      navigate('/tax-claims');
    }, 3000);
  };

  return (
    <div className="container-responsive py-8">
      <div className="max-w-4xl mx-auto">
        {/* 步驟指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div
                className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step === 'upload' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'}
              `}
              >
                1
              </div>
              <span className="ml-2 text-sm">上傳收據</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-700" />

            <div className="flex items-center">
              <div
                className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step === 'result' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-gray-400'}
              `}
              >
                2
              </div>
              <span className="ml-2 text-sm">確認資訊</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-700" />

            <div className="flex items-center">
              <div
                className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step === 'success' ? 'bg-success text-white' : 'bg-gray-700 text-gray-400'}
              `}
              >
                3
              </div>
              <span className="ml-2 text-sm">完成</span>
            </div>
          </div>
        </div>

        {/* 步驟 1: 上傳收據 */}
        {step === 'upload' && (
          <div className="space-y-6 animate-fade-in">
            <div className="card">
              <h1 className="text-2xl font-bold mb-2">申請退稅</h1>
              <p className="text-gray-400 mb-6">
                選擇使用 AI 自動辨識或手動輸入收據資訊
              </p>

              {/* 輸入模式選擇 */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setInputMode('ai')}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${inputMode === 'ai'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-6 h-6 ${inputMode === 'ai' ? 'text-primary-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <div className="text-left">
                        <div className={`font-semibold ${inputMode === 'ai' ? 'text-primary-400' : 'text-white'}`}>
                          AI 自動辨識
                        </div>
                        <div className="text-xs text-gray-400">上傳照片自動識別</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setInputMode('manual')}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${inputMode === 'manual'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <svg className={`w-6 h-6 ${inputMode === 'manual' ? 'text-primary-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <div className="text-left">
                        <div className={`font-semibold ${inputMode === 'manual' ? 'text-primary-400' : 'text-white'}`}>
                          手動輸入
                        </div>
                        <div className="text-xs text-gray-400">自行填寫收據資訊</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* AI 模式 - 上傳收據 */}
              {inputMode === 'ai' && (
                <div className="space-y-4">
                  <ReceiptUpload onFilesChange={setFiles} />

                  {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-red-400 text-sm font-semibold mb-1">發生錯誤</p>
                          <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
                          {error.includes('OCR') && (
                            <button
                              onClick={() => setInputMode('manual')}
                              className="mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                              改為手動輸入收據資訊 →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/tax-claims')}
                      className="btn btn-secondary flex-1"
                      disabled={isSubmitting}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={files.length === 0 || isSubmitting}
                      className="btn btn-primary flex-1"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          處理中... (AI 識別中)
                        </span>
                      ) : (
                        '開始 AI 辨識'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 手動輸入模式 */}
              {inputMode === 'manual' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50">
                    <p className="text-blue-400 text-sm">
                      💡 請填寫收據上的資訊。如果您有收據照片,可以選擇上傳作為憑證(選填)。
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      商家名稱 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualMerchantName}
                      onChange={(e) => setManualMerchantName(e.target.value)}
                      placeholder="例如:台北 101 購物中心"
                      className="input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      購買日期 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={manualPurchaseDate}
                      onChange={(e) => setManualPurchaseDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      總金額 (NT$) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={manualTotalAmount}
                      onChange={(e) => setManualTotalAmount(e.target.value)}
                      placeholder="例如:5000"
                      min="2000"
                      step="1"
                      className="input w-full"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ※ 最低退稅門檻為 NT$ 2,000
                    </p>
                  </div>

                  {/* 入境資訊 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      入境資訊 <span className="text-red-400">*</span>
                    </label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={manualEntryFlight}
                        onChange={(e) => setManualEntryFlight(e.target.value)}
                        placeholder="航班號碼 (例如: CI123)"
                        className="input w-full"
                        required
                      />
                      <input
                        type="date"
                        value={manualEntryFlightDate}
                        onChange={(e) => setManualEntryFlightDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="input w-full"
                        required
                      />
                    </div>
                  </div>

                  {/* 出境資訊 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      出境資訊 <span className="text-red-400">*</span>
                    </label>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={manualExitFlight}
                        onChange={(e) => setManualExitFlight(e.target.value)}
                        placeholder="航班號碼 (例如: CI124)"
                        className="input w-full"
                        required
                      />
                      <input
                        type="date"
                        value={manualExitFlightDate}
                        onChange={(e) => setManualExitFlightDate(e.target.value)}
                        min={manualEntryFlightDate || undefined}
                        className="input w-full"
                        required
                      />
                    </div>
                    {manualEntryFlightDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        ※ 出境日期必須在入境日期之後
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      收據照片 (選填)
                    </label>
                    <ReceiptUpload onFilesChange={setFiles} />
                    <p className="text-xs text-gray-500 mt-1">
                      上傳收據照片可加快審核速度
                    </p>
                  </div>

                  {error && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/50">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-red-400 text-sm font-semibold mb-1">發生錯誤</p>
                          <p className="text-red-400 text-sm whitespace-pre-line">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => navigate('/tax-claims')}
                      className="btn btn-secondary flex-1"
                      disabled={isSubmitting}
                    >
                      取消
                    </button>
                    <button
                      onClick={handleManualSubmit}
                      disabled={
                        isSubmitting ||
                        !manualMerchantName ||
                        !manualPurchaseDate ||
                        !manualTotalAmount ||
                        !manualEntryFlight ||
                        !manualEntryFlightDate ||
                        !manualExitFlight ||
                        !manualExitFlightDate
                      }
                      className="btn btn-primary flex-1"
                    >
                      {isSubmitting ? '提交中...' : '提交申請'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 提示卡片 - 只在 AI 模式下顯示 */}
            {inputMode === 'ai' && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="glass p-4 rounded-lg">
                  <div className="text-2xl mb-2">📸</div>
                  <h3 className="font-semibold text-sm mb-1">清晰拍攝</h3>
                  <p className="text-xs text-gray-400">確保收據上的文字清晰可見</p>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-2xl mb-2">💡</div>
                  <h3 className="font-semibold text-sm mb-1">光線充足</h3>
                  <p className="text-xs text-gray-400">在明亮環境下拍攝效果更好</p>
                </div>
                <div className="glass p-4 rounded-lg">
                  <div className="text-2xl mb-2">✅</div>
                  <h3 className="font-semibold text-sm mb-1">完整收據</h3>
                  <p className="text-xs text-gray-400">包含店名、日期、金額資訊</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 步驟 2: OCR 結果確認 */}
        {step === 'result' && claim && (
          <div className="space-y-6 animate-fade-in">
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">確認退稅資訊</h2>

              {/* OCR 識別結果 */}
              <div className="space-y-4 mb-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="glass p-4 rounded-lg">
                    <label className="text-sm text-gray-400 mb-1 block">商家名稱</label>
                    <p className="text-lg font-semibold">
                      {ocrResult?.merchantName || '未識別'}
                    </p>
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <label className="text-sm text-gray-400 mb-1 block">購買日期</label>
                    <p className="text-lg font-semibold">
                      {ocrResult?.purchaseDate || '未識別'}
                    </p>
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <label className="text-sm text-gray-400 mb-1 block">總金額</label>
                    <p className="text-lg font-semibold text-primary-400">
                      NT$ {claim.totalAmount?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="glass p-4 rounded-lg">
                    <label className="text-sm text-gray-400 mb-1 block">退稅金額 (5%)</label>
                    <p className="text-2xl font-bold text-accent-400">
                      NT$ {claim.taxAmount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {/* 信心度 */}
                {ocrResult?.confidence !== undefined && (
                  <div className="glass p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {ocrResult.confidence === 1.0 ? '手動輸入' : 'AI 識別信心度'}
                      </span>
                      <span className="text-sm font-semibold">
                        {(ocrResult.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
                        style={{ width: `${ocrResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 提示訊息 */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50 mb-6">
                <p className="text-blue-400 text-sm">
                  💡 請確認以上資訊是否正確。提交後,我們將進行人工審核。
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('upload')}
                  className="btn btn-secondary flex-1"
                >
                  重新上傳
                </button>
                <button onClick={handleConfirm} className="btn btn-primary flex-1">
                  確認提交
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步驟 3: 成功 */}
        {step === 'success' && (
          <div className="card text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20">
              <svg
                className="w-10 h-10 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">提交成功!</h2>
              <p className="text-gray-400">
                您的退稅申請已提交,我們將盡快審核
              </p>
            </div>

            <div className="glass p-6 rounded-lg">
              <p className="text-sm text-gray-400 mb-2">預計退稅金額</p>
              <p className="text-4xl font-bold text-accent-400">
                NT$ {claim?.taxAmount?.toLocaleString() || 0}
              </p>
            </div>

            <div className="text-sm text-gray-500">
              <p>3 秒後自動跳轉到申請列表...</p>
            </div>

            <button
              onClick={() => navigate('/tax-claims')}
              className="btn btn-primary"
            >
              立即查看
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
