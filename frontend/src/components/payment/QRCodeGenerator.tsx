/**
 * QR Code 生成器組件
 * 用於店家生成支付 QR Code
 */

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  bgColor?: string;
  fgColor?: string;
  imageSettings?: {
    src: string;
    height: number;
    width: number;
    excavate: boolean;
  };
  onDownload?: () => void;
  className?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  value,
  size = 256,
  level = 'M',
  includeMargin = true,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  imageSettings,
  onDownload,
  className = '',
}) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        onDownload?.();
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className={`qrcode-generator ${className}`}>
      <div
        ref={qrCodeRef}
        className="qrcode-container inline-block p-4 bg-white rounded-lg shadow-lg"
      >
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={includeMargin}
          bgColor={bgColor}
          fgColor={fgColor}
          imageSettings={imageSettings}
        />
      </div>

      {onDownload && (
        <button
          onClick={handleDownload}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          下載 QR Code
        </button>
      )}
    </div>
  );
};

export default QRCodeGenerator;
