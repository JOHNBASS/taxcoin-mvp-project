/**
 * Self Protocol KYC 快速驗證組件
 * 使用 Self SDK 的 QR Code 進行零知識證明驗證
 */

import { useState, useMemo } from 'react';
import { SelfQRcode, SelfAppBuilder } from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';

interface User {
  id: string;
  walletAddress?: string;
  [key: string]: any;
}

interface SelfKycVerificationProps {
  user: User | null;
  onVerificationComplete: () => void;
  onError: (error: string) => void;
}

/**
 * 生成符合 UUID v4 格式的 ID
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const SelfKycVerification = ({
  user,
  onVerificationComplete,
  onError
}: SelfKycVerificationProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');

  // 檢查是否為開發環境（localhost）
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // 使用 SelfAppBuilder 構建 SelfApp 配置（僅在生產環境）
  const selfApp: SelfApp | null = useMemo(() => {
    // Self Protocol SDK 不支援 localhost，只在生產環境啟用
    if (isDevelopment) {
      return null;
    }

    // Self Protocol 要求 userId 必須是 UUID v4 格式，不能使用 MongoDB ObjectId
    // 所以我們總是生成一個新的 UUID，並將真實的用戶信息放在 userDefinedData 中
    const selfUserId = generateUUID();

    // 將用戶信息編碼到 userDefinedData，後端會從這裡讀取真實的用戶 ID
    const userDefinedData = JSON.stringify({
      userId: user?.id,           // MongoDB ObjectId (後端用來識別用戶)
      walletAddress: user?.walletAddress
    });

    return new SelfAppBuilder({
      appName: 'TaxCoin KYC',
      scope: 'taxcoin-kyc',
      endpoint: `${window.location.origin}/api/v1/kyc/self-verify`,
      endpointType: 'staging_https',
      sessionId: generateUUID(),
      userId: selfUserId,         // 必須是 UUID v4 格式（Self SDK 要求）
      userIdType: 'uuid',
      devMode: true,              // 使用 dev mode 以配合 mock passport (Celo Testnet)
      userDefinedData: userDefinedData, // 傳遞真實用戶信息給後端
      disclosures: {
        name: true,
        passport_number: true,
        nationality: true,
        date_of_birth: true,
        minimumAge: 18,
        excludedCountries: ['IRN', 'PRK', 'SYR', 'CUB'], // ISO 3166-1 alpha-3
        ofac: true
      }
    }).build();
  }, [isDevelopment, user]);

  // 處理驗證成功
  const handleVerificationSuccess = () => {
    console.log('Self Protocol 驗證成功');
    setVerificationStatus('驗證成功！正在處理...');
    setIsVerifying(false);

    // 通知父組件
    setTimeout(() => {
      onVerificationComplete();
    }, 1000);
  };

  // 處理驗證失敗
  const handleVerificationError = (error: { error_code?: string; reason?: string }) => {
    console.error('Self Protocol 驗證失敗:', error);
    const errorMessage = error?.reason || error?.error_code || '驗證失敗，請重試';
    setVerificationStatus(`驗證失敗: ${errorMessage}`);
    setIsVerifying(false);
    onError(errorMessage);
  };

  return (
    <div className="self-kyc-verification">
      {/* 說明區域 */}
      <div className="glass p-6 rounded-lg mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          Self Protocol 快速驗證
        </h3>

        <div className="space-y-3 text-sm">
          <p className="text-gray-300">
            使用 Self Protocol 零知識證明技術，2 分鐘完成 KYC 驗證
          </p>

          <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-500/10 rounded">
            <p className="font-semibold mb-2">✨ 優勢：</p>
            <ul className="space-y-1 text-gray-300">
              <li>• <strong>隱私保護</strong> - 零知識證明，不暴露完整個資</li>
              <li>• <strong>即時驗證</strong> - 無需等待人工審核</li>
              <li>• <strong>高準確度</strong> - NFC 護照晶片讀取，99% 準確率</li>
              <li>• <strong>安全可靠</strong> - 通過生物識別確保本人操作</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 步驟說明 */}
      <div className="glass p-6 rounded-lg mb-6">
        <h4 className="font-bold mb-3 flex items-center gap-2">
          <span>📱</span>
          驗證步驟
        </h4>
        <ol className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <span>確保您的手機支持 <strong>NFC 功能</strong>（iPhone 7+ 或多數 Android 手機）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <span>首次使用需下載 <strong>Self App</strong>（掃描後會自動引導）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <span>掃描下方 QR Code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <span>將護照靠近手機<strong>背面</strong>進行 NFC 掃描</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">5</span>
            <span>完成臉部驗證</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">6</span>
            <span>自動完成驗證，無需等待審核！</span>
          </li>
        </ol>
      </div>

      {/* QR Code 顯示區域 */}
      <div className="glass p-8 rounded-lg">
        <div className="flex flex-col items-center">
          <h4 className="font-bold mb-4 text-center">
            請使用手機掃描此 QR Code
          </h4>

          {/* Self SDK QR Code 組件 */}
          {isDevelopment ? (
            /* 開發環境：顯示說明訊息 */
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 p-8 rounded-lg mb-4">
              <div className="text-center space-y-4">
                <div className="text-6xl">🔒</div>
                <h4 className="text-xl font-bold text-blue-400">開發環境限制</h4>
                <div className="text-gray-300 space-y-2 max-w-md mx-auto">
                  <p>
                    Self Protocol 零知識證明需要在 <strong className="text-blue-400">HTTPS 生產環境</strong> 中運行。
                  </p>
                  <p className="text-sm">
                    這是為了確保您的隱私數據在傳輸過程中完全加密，符合零知識證明的安全標準。
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400">
                    💡 部署到生產環境後，這裡會顯示 QR Code 供用戶掃描
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    生產域名：<span className="text-blue-400">https://taxcoin-mvp.transferhelper.com.tw</span>
                  </p>
                </div>
              </div>
            </div>
          ) : selfApp ? (
            /* 生產環境：顯示真正的 QR Code */
            <div className="bg-white p-4 rounded-lg mb-4">
              <SelfQRcode
                selfApp={selfApp}
                onSuccess={handleVerificationSuccess}
                onError={handleVerificationError}
                type="websocket"
                size={256}
                darkMode={false}
              />
            </div>
          ) : (
            /* 配置錯誤 */
            <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg mb-4">
              <p className="text-red-300">⚠️ Self Protocol 配置錯誤</p>
            </div>
          )}

          {/* 狀態顯示 */}
          {verificationStatus && (
            <div className={`mt-4 p-3 rounded-lg text-center ${
              verificationStatus.includes('失敗')
                ? 'bg-red-500/20 text-red-300'
                : verificationStatus.includes('成功')
                ? 'bg-green-500/20 text-green-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {isVerifying && (
                <div className="inline-block mr-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                </div>
              )}
              {verificationStatus}
            </div>
          )}

          {/* 提示信息 */}
          <div className="mt-6 text-xs text-gray-400 text-center max-w-md">
            <p>🔒 您的隱私受到保護</p>
            <p className="mt-1">
              Self Protocol 使用零知識證明技術，只驗證必要信息，
              不會存儲您的完整護照數據。
            </p>
          </div>
        </div>
      </div>

      {/* 技術說明 */}
      <div className="mt-6 p-4 border border-gray-700 rounded-lg text-xs text-gray-400">
        <p className="mb-2">
          <strong>🛡️ 技術保障：</strong>
        </p>
        <ul className="space-y-1 ml-4">
          <li>• W3C 去中心化身份標準 (DID)</li>
          <li>• 可驗證憑證 (Verifiable Credentials)</li>
          <li>• 零知識證明 (Zero-Knowledge Proofs)</li>
          <li>• NFC 護照晶片驗證</li>
        </ul>
      </div>
    </div>
  );
};
