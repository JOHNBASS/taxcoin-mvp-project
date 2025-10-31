import { useState } from 'react';
import type { VerifiableCredential } from '../types';

interface CredentialVerifierProps {
  credential?: VerifiableCredential;
  credentialId?: string;
}

export const CredentialVerifier = ({ credential, credentialId }: CredentialVerifierProps) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    reason?: string;
  } | null>(null);

  const handleVerify = async () => {
    if (!credential && !credentialId) {
      alert('無可驗證的憑證');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/kyc/verify-credential', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ credential, credentialId }),
      });

      if (!response.ok) {
        throw new Error('驗證請求失敗');
      }

      const result = await response.json();
      setVerificationResult(result.data);
    } catch (error) {
      setVerificationResult({
        isValid: false,
        reason: error instanceof Error ? error.message : '驗證請求失敗',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleVerify}
        disabled={isVerifying}
        className="btn btn-sm btn-primary w-full"
      >
        {isVerifying ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            驗證中...
          </span>
        ) : (
          '🔍 驗證憑證真實性'
        )}
      </button>

      {verificationResult && (
        <div
          className={`p-3 rounded-lg border animate-fade-in ${
            verificationResult.isValid
              ? 'bg-success/10 border-success/50'
              : 'bg-red-500/10 border-red-500/50'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-lg mt-0.5">
              {verificationResult.isValid ? '✅' : '❌'}
            </span>
            <div className="flex-1">
              <p className={`font-semibold ${
                verificationResult.isValid ? 'text-success' : 'text-red-400'
              }`}>
                {verificationResult.isValid ? '憑證驗證通過' : '憑證驗證失敗'}
              </p>
              {verificationResult.reason && (
                <p className="text-sm text-gray-400 mt-1">
                  {verificationResult.reason}
                </p>
              )}
              {verificationResult.isValid && (
                <p className="text-xs text-gray-500 mt-2">
                  此憑證已通過密碼學簽名驗證，確認由授權機構簽發
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
