import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger.js';
import { OcrResult } from '@/types/index.js';

logger.info('✅ 使用 Tesseract.js 進行 OCR (免費開源方案)');

/**
 * 使用 Tesseract.js 進行收據 OCR 識別
 * @param imagePath - 圖片檔案路徑
 * @returns OCR 結果
 */
export const extractReceiptData = async (
  imagePath: string
): Promise<OcrResult> => {
  try {
    logger.info('開始 OCR 處理', { imagePath });

    // 使用 Tesseract.js 進行 OCR
    const result = await Tesseract.recognize(imagePath, 'chi_tra+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`OCR 進度: ${Math.round(m.progress * 100)}%`);
        }
      },
      // 改用本地語言包路徑,避免下載失敗
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    });

    const text = result.data.text;
    const confidence = result.data.confidence / 100;

    logger.info('Tesseract OCR 完成', {
      confidence,
      textLength: text.length,
      textPreview: text.substring(0, 100),
    });

    // 從文字中提取結構化資訊
    const ocrData = parseReceiptText(text);

    // 如果文字內容太少,可能識別失敗
    if (text.trim().length < 10) {
      logger.warn('OCR 識別文字過少,可能圖片不清晰', { textLength: text.length });
      throw new Error('OCR 識別文字過少');
    }

    return {
      ...ocrData,
      confidence,
    };
  } catch (error) {
    logger.error('OCR 處理失敗', { error, imagePath });
    // 不再降級使用模擬數據,而是拋出錯誤
    throw error;
  }
};

/**
 * 從 Tesseract 識別的文字中提取收據資訊
 */
const parseReceiptText = (text: string): Omit<OcrResult, 'confidence'> => {
  logger.debug('開始解析 OCR 文字', { textLength: text.length });

  // 提取金額 (尋找類似 "總計" "Total" "NT$" 後面的數字)
  const amountPatterns = [
    /(?:總計|Total|小計|合計)\s*:?\s*NT?\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /NT\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    /(?:Total|Amount)\s*:?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
  ];

  let totalAmount = 0;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      totalAmount = parseFloat(match[1].replace(/,/g, ''));
      logger.debug('找到金額', { totalAmount, pattern: pattern.source });
      break;
    }
  }

  // 提取日期
  const datePatterns = [
    /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?)/,
    /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
    /(\d{4}\d{2}\d{2})/,
  ];

  let purchaseDate = new Date().toISOString().split('T')[0] || '';
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      purchaseDate = formatDate(match[1]);
      logger.debug('找到日期', { purchaseDate });
      break;
    }
  }

  // 提取商店名稱 (通常在第一行或包含特定關鍵字的行)
  const lines = text.split('\n').filter((line) => line.trim());
  let merchantName = '未知商店';

  // 檢查前 5 行,找最可能的商店名稱
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmedLine = line.trim();
    // 跳過純數字或太短的行
    if (trimmedLine.length > 3 && !/^\d+$/.test(trimmedLine)) {
      merchantName = trimmedLine;
      logger.debug('找到商店名稱', { merchantName });
      break;
    }
  }

  // 嘗試提取商品列表 (簡化版,僅提取明顯的商品行)
  const items = extractItems(text);

  return {
    merchantName,
    purchaseDate,
    totalAmount,
    items,
  };
};

/**
 * 從文字中提取商品列表
 */
const extractItems = (
  text: string
): Array<{ name: string; quantity: number; price: number }> => {
  const items: Array<{ name: string; quantity: number; price: number }> = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // 尋找包含數量和價格的行
    // 格式範例: "商品名稱 x2 $100" 或 "商品名稱 2 100"
    const itemMatch = line.match(
      /^(.+?)\s+(?:x|X)?\s*(\d+)\s+(?:NT\$|\$)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/
    );

    if (itemMatch && itemMatch[1] && itemMatch[2] && itemMatch[3]) {
      const name = itemMatch[1].trim();
      const quantity = parseInt(itemMatch[2]);
      const price = parseFloat(itemMatch[3].replace(/,/g, ''));

      items.push({ name, quantity, price });
    }
  }

  // 如果沒有找到商品,返回空陣列
  return items;
};

/**
 * 格式化日期為 YYYY-MM-DD
 */
const formatDate = (dateStr: string): string => {
  try {
    // 處理各種日期格式
    let cleanDate = dateStr.replace(/[年月日]/g, '-').replace(/\//g, '-');

    // 如果是 YYYYMMDD 格式
    if (/^\d{8}$/.test(cleanDate)) {
      cleanDate = `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
    }

    const date = new Date(cleanDate);

    // 檢查日期是否有效
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0] || '';
    }

    return date.toISOString().split('T')[0] || '';
  } catch {
    return new Date().toISOString().split('T')[0] || '';
  }
};

/**
 * 模擬 OCR 結果 (用於開發測試或 OCR 失敗時)
 * 暫時保留但未使用
 */
export const getMockOcrResult = (): OcrResult => {
  return {
    merchantName: '台北101購物中心 (模擬)',
    purchaseDate: new Date().toISOString().split('T')[0] || '',
    totalAmount: 5000,
    items: [
      {
        name: '精品包',
        quantity: 1,
        price: 3000,
      },
      {
        name: '化妝品',
        quantity: 2,
        price: 1000,
      },
    ],
    confidence: 0.75,
  };
};

/**
 * 批次處理多張收據
 * @param imagePaths - 圖片路徑陣列
 * @returns OCR 結果陣列
 */
export const extractMultipleReceipts = async (
  imagePaths: string[]
): Promise<OcrResult[]> => {
  logger.info(`批次處理 ${imagePaths.length} 張收據`);

  const results = await Promise.all(
    imagePaths.map((path) => extractReceiptData(path))
  );

  return results;
};

/**
 * 驗證 OCR 結果的合理性
 * @param ocrResult - OCR 結果
 * @returns 是否有效
 */
export const validateOcrResult = (ocrResult: OcrResult): boolean => {
  // 檢查必要欄位
  if (!ocrResult.merchantName || !ocrResult.purchaseDate) {
    logger.warn('OCR 結果缺少必要欄位', { ocrResult });
    return false;
  }

  // 檢查金額合理性 (1-1,000,000 TWD)
  if (ocrResult.totalAmount <= 0 || ocrResult.totalAmount > 1000000) {
    logger.warn('OCR 金額不合理', { totalAmount: ocrResult.totalAmount });
    return false;
  }

  // 檢查信心度 (至少 50%)
  if (ocrResult.confidence < 0.5) {
    logger.warn('OCR 信心度過低', { confidence: ocrResult.confidence });
    return false;
  }

  // 檢查日期合理性 (不能是未來日期)
  const purchaseDate = new Date(ocrResult.purchaseDate);
  const now = new Date();
  if (purchaseDate > now) {
    logger.warn('OCR 日期為未來', { purchaseDate });
    return false;
  }

  // 檢查日期不能太久之前 (例如 2 年內)
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  if (purchaseDate < twoYearsAgo) {
    logger.warn('OCR 日期過舊', { purchaseDate });
    return false;
  }

  return true;
};
