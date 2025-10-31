/**
 * QR Code 掃描器組件 - Web3 風格
 * 用於旅客掃描支付 QR Code
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  className?: string;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  onScan,
  onError,
  fps = 10,
  qrbox = 250,
  aspectRatio = 1,
  disableFlip = false,
  className = '',
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .catch((err) => console.error('Failed to stop scanner:', err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission('granted');

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps,
          qrbox,
          aspectRatio,
          disableFlip,
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Ignore frequent scanning errors
          if (errorMessage.includes('NotFoundException')) {
            return;
          }
          console.warn('QR Scan Error:', errorMessage);
        }
      );

      setIsScanning(true);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '無法啟動相機';
      setError(errorMsg);
      setCameraPermission('denied');
      onError?.(errorMsg);
    }
  };

  const stopScanning = async () => {
    if (!scannerRef.current?.isScanning) return;

    try {
      await scannerRef.current.stop();
      setIsScanning(false);
    } catch (err) {
      console.error('Failed to stop scanner:', err);
    }
  };

  return (
    <div className={`qrcode-scanner ${className}`}>
      <div className="scanner-container">
        <div id="qr-reader" className="rounded-2xl overflow-hidden border-4 border-cyan-500/30 shadow-2xl shadow-cyan-500/30" />

        {!isScanning && (
          <div className="scanner-controls mt-6 text-center">
            {cameraPermission === 'denied' ? (
              <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/50 rounded-2xl p-6 shadow-lg shadow-red-500/20">
                <p className="text-red-300 font-bold text-lg mb-2">📷 相機權限被拒絕</p>
                <p className="text-sm text-red-200 mt-2">
                  請在瀏覽器設定中允許相機權限，然後重新整理頁面
                </p>
              </div>
            ) : (
              <button
                onClick={startScanning}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl hover:from-cyan-600 hover:to-purple-700 transition-all duration-300 text-lg font-bold shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 transform hover:scale-105"
              >
                🎥 開始掃描
              </button>
            )}
          </div>
        )}

        {isScanning && (
          <div className="scanner-controls mt-6 text-center">
            <button
              onClick={stopScanning}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-bold shadow-lg shadow-red-500/30"
            >
              ⏹️ 停止掃描
            </button>
            <p className="text-sm text-cyan-200 mt-3 font-semibold">
              📱 將 QR Code 對準掃描框
            </p>
          </div>
        )}

        {error && (
          <div className="error-message mt-4 backdrop-blur-xl bg-red-500/10 border border-red-500/50 rounded-2xl p-4 shadow-lg shadow-red-500/20">
            <p className="font-bold text-red-300">⚠️ 錯誤</p>
            <p className="text-sm text-red-200 mt-1">{error}</p>
          </div>
        )}
      </div>

      <style>{`
        #qr-reader {
          width: 100%;
          max-width: 500px;
          margin: 0 auto;
        }

        #qr-reader video {
          width: 100%;
          height: auto;
          border-radius: 1rem;
        }

        #qr-reader__dashboard {
          display: none !important;
        }

        #qr-reader__scan_region {
          border: 4px solid rgba(6, 182, 212, 0.5) !important;
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.3) !important;
        }
      `}</style>
    </div>
  );
};

export default QRCodeScanner;
