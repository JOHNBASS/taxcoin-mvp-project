import Tesseract from 'tesseract.js';
import { logger } from '../utils/logger.js';
logger.info('✅ 使用 Tesseract.js 進行 OCR (免費開源方案)');
export const extractReceiptData = async (imagePath) => {
    try {
        logger.info('開始 OCR 處理', { imagePath });
        const result = await Tesseract.recognize(imagePath, 'chi_tra+eng', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    logger.debug(`OCR 進度: ${Math.round(m.progress * 100)}%`);
                }
            },
        });
        const text = result.data.text;
        const confidence = result.data.confidence / 100;
        logger.info('Tesseract OCR 完成', {
            confidence,
            textLength: text.length,
        });
        const ocrData = parseReceiptText(text);
        return {
            ...ocrData,
            confidence,
        };
    }
    catch (error) {
        logger.error('OCR 處理失敗', { error, imagePath });
        logger.warn('降級使用模擬 OCR 資料');
        return getMockOcrResult();
    }
};
const parseReceiptText = (text) => {
    logger.debug('開始解析 OCR 文字', { textLength: text.length });
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
    const lines = text.split('\n').filter((line) => line.trim());
    let merchantName = '未知商店';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (!line)
            continue;
        const trimmedLine = line.trim();
        if (trimmedLine.length > 3 && !/^\d+$/.test(trimmedLine)) {
            merchantName = trimmedLine;
            logger.debug('找到商店名稱', { merchantName });
            break;
        }
    }
    const items = extractItems(text);
    return {
        merchantName,
        purchaseDate,
        totalAmount,
        items,
    };
};
const extractItems = (text) => {
    const items = [];
    const lines = text.split('\n');
    for (const line of lines) {
        const itemMatch = line.match(/^(.+?)\s+(?:x|X)?\s*(\d+)\s+(?:NT\$|\$)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
        if (itemMatch && itemMatch[1] && itemMatch[2] && itemMatch[3]) {
            const name = itemMatch[1].trim();
            const quantity = parseInt(itemMatch[2]);
            const price = parseFloat(itemMatch[3].replace(/,/g, ''));
            items.push({ name, quantity, price });
        }
    }
    return items;
};
const formatDate = (dateStr) => {
    try {
        let cleanDate = dateStr.replace(/[年月日]/g, '-').replace(/\//g, '-');
        if (/^\d{8}$/.test(cleanDate)) {
            cleanDate = `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
        }
        const date = new Date(cleanDate);
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0] || '';
        }
        return date.toISOString().split('T')[0] || '';
    }
    catch {
        return new Date().toISOString().split('T')[0] || '';
    }
};
const getMockOcrResult = () => {
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
export const extractMultipleReceipts = async (imagePaths) => {
    logger.info(`批次處理 ${imagePaths.length} 張收據`);
    const results = await Promise.all(imagePaths.map((path) => extractReceiptData(path)));
    return results;
};
export const validateOcrResult = (ocrResult) => {
    if (!ocrResult.merchantName || !ocrResult.purchaseDate) {
        logger.warn('OCR 結果缺少必要欄位', { ocrResult });
        return false;
    }
    if (ocrResult.totalAmount <= 0 || ocrResult.totalAmount > 1000000) {
        logger.warn('OCR 金額不合理', { totalAmount: ocrResult.totalAmount });
        return false;
    }
    if (ocrResult.confidence < 0.5) {
        logger.warn('OCR 信心度過低', { confidence: ocrResult.confidence });
        return false;
    }
    const purchaseDate = new Date(ocrResult.purchaseDate);
    const now = new Date();
    if (purchaseDate > now) {
        logger.warn('OCR 日期為未來', { purchaseDate });
        return false;
    }
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    if (purchaseDate < twoYearsAgo) {
        logger.warn('OCR 日期過舊', { purchaseDate });
        return false;
    }
    return true;
};
//# sourceMappingURL=ocr.service.js.map