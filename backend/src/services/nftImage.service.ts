/**
 * NFT 圖片生成服務
 *
 * 為退稅憑證 NFT 動態生成 SVG 圖片
 */

export interface NFTImageParams {
  claimId: string;
  merchantName: string;
  purchaseDate: string;
  originalAmount: number;
  taxAmount: number;
  did: string;
}

export class NFTImageService {
  /**
   * 生成退稅憑證 NFT 的 SVG 圖片
   */
  static generateNFTImage(params: NFTImageParams): string {
    const { claimId, merchantName, purchaseDate, originalAmount, taxAmount, did } = params;

    // 格式化金額顯示
    const formattedOriginal = (originalAmount / 100).toLocaleString('zh-TW');
    const formattedTax = (taxAmount / 100).toLocaleString('zh-TW');

    // 格式化日期
    const date = new Date(purchaseDate);
    const formattedDate = date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // 截短 DID 和 claimId 用於顯示
    const shortDID = did.length > 20 ? `${did.substring(0, 10)}...${did.substring(did.length - 6)}` : did;
    const shortClaimId = `#${claimId.substring(0, 8)}`;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="600" height="800" viewBox="0 0 600 800" xmlns="http://www.w3.org/2000/svg">
  <!-- 漸層背景 -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />
    </linearGradient>

    <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#533483;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#7048e8;stop-opacity:0.9" />
    </linearGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect width="600" height="800" fill="url(#bgGradient)"/>

  <!-- 裝飾圓點 -->
  <circle cx="50" cy="50" r="4" fill="#7048e8" opacity="0.3"/>
  <circle cx="550" cy="100" r="6" fill="#7048e8" opacity="0.2"/>
  <circle cx="100" cy="700" r="5" fill="#7048e8" opacity="0.25"/>
  <circle cx="500" cy="750" r="4" fill="#7048e8" opacity="0.3"/>

  <!-- 主卡片 -->
  <rect x="40" y="100" width="520" height="600" rx="24" fill="url(#cardGradient)" opacity="0.15"/>
  <rect x="40" y="100" width="520" height="600" rx="24" fill="none" stroke="#7048e8" stroke-width="2"/>

  <!-- LOGO 圖示 -->
  <circle cx="300" cy="160" r="40" fill="#7048e8" opacity="0.3" filter="url(#glow)"/>
  <text x="300" y="175" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#fff" text-anchor="middle">💰</text>

  <!-- 標題 -->
  <text x="300" y="240" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="32" font-weight="bold" fill="#fff" text-anchor="middle">退稅憑證 NFT</text>
  <text x="300" y="270" font-family="Arial, sans-serif" font-size="16" fill="#a0a0a0" text-anchor="middle">Tax Refund Certificate</text>

  <!-- 分隔線 -->
  <line x1="80" y1="300" x2="520" y2="300" stroke="#7048e8" stroke-width="2" opacity="0.5"/>

  <!-- 申請編號 -->
  <text x="80" y="340" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="16" fill="#a0a0a0">申請編號</text>
  <text x="520" y="340" font-family="monospace" font-size="18" font-weight="bold" fill="#fff" text-anchor="end">${shortClaimId}</text>

  <!-- 商家名稱 -->
  <text x="80" y="385" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="16" fill="#a0a0a0">商家</text>
  <text x="520" y="385" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="18" font-weight="bold" fill="#fff" text-anchor="end">${merchantName}</text>

  <!-- 購買日期 -->
  <text x="80" y="430" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="16" fill="#a0a0a0">購買日期</text>
  <text x="520" y="430" font-family="monospace" font-size="18" fill="#fff" text-anchor="end">${formattedDate}</text>

  <!-- 分隔線 -->
  <line x1="80" y1="460" x2="520" y2="460" stroke="#7048e8" stroke-width="1" opacity="0.3"/>

  <!-- 原始金額 -->
  <text x="80" y="500" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="16" fill="#a0a0a0">原始金額</text>
  <text x="520" y="500" font-family="monospace" font-size="18" fill="#fff" text-anchor="end">NT$ ${formattedOriginal}</text>

  <!-- 退稅金額（高亮） -->
  <rect x="70" y="520" width="460" height="60" rx="12" fill="#7048e8" opacity="0.2"/>
  <text x="80" y="550" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="18" font-weight="bold" fill="#a0a0a0">退稅金額</text>
  <text x="520" y="565" font-family="monospace" font-size="32" font-weight="bold" fill="#7048e8" text-anchor="end" filter="url(#glow)">NT$ ${formattedTax}</text>

  <!-- DID -->
  <text x="80" y="620" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="14" fill="#808080">數位身份 (DID)</text>
  <text x="520" y="620" font-family="monospace" font-size="12" fill="#a0a0a0" text-anchor="end">${shortDID}</text>

  <!-- 底部資訊 -->
  <text x="300" y="680" font-family="'PingFang TC', 'Microsoft JhengHei', sans-serif" font-size="14" fill="#808080" text-anchor="middle">此 NFT 證明您已成功完成退稅申請</text>
  <text x="300" y="700" font-family="Arial, sans-serif" font-size="12" fill="#606060" text-anchor="middle">Powered by TaxCoin on Sui Blockchain</text>

  <!-- 裝飾元素 - 核取標記 -->
  <circle cx="300" cy="730" r="20" fill="#7048e8" opacity="0.3"/>
  <text x="300" y="740" font-family="Arial, sans-serif" font-size="24" fill="#7048e8" text-anchor="middle">✓</text>
</svg>`;

    return svg;
  }

  /**
   * 將 SVG 轉換為 Data URL（可直接在瀏覽器中顯示）
   */
  static svgToDataURL(svg: string): string {
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * 生成 NFT 元數據（符合 NFT 標準）
   */
  static generateMetadata(params: NFTImageParams) {
    const svg = this.generateNFTImage(params);
    const imageDataURL = this.svgToDataURL(svg);

    return {
      name: `退稅憑證 #${params.claimId.substring(0, 8)}`,
      description: `退稅金額 NT$ ${(params.taxAmount / 100).toLocaleString('zh-TW')} 的退稅憑證 NFT`,
      image: imageDataURL,
      external_url: `https://taxcoin.app/claims/${params.claimId}`,
      attributes: [
        {
          trait_type: '申請編號',
          value: params.claimId,
        },
        {
          trait_type: '商家',
          value: params.merchantName,
        },
        {
          trait_type: '購買日期',
          value: params.purchaseDate,
        },
        {
          trait_type: '原始金額 (TWD)',
          value: params.originalAmount / 100,
          display_type: 'number',
        },
        {
          trait_type: '退稅金額 (TWD)',
          value: params.taxAmount / 100,
          display_type: 'number',
        },
        {
          trait_type: '數位身份',
          value: params.did,
        },
      ],
    };
  }
}
