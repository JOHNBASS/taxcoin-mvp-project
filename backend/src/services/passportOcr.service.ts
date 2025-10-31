/**
 * 護照 OCR 識別服務
 *
 * 使用 Tesseract.js 識別護照資訊
 */

import Tesseract from 'tesseract.js';
import { logger } from '@/utils/logger.js';

/**
 * 護照 OCR 識別結果
 */
export interface PassportOcrResult {
  passportNumber: string;
  fullName: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  expiryDate: string;
  issueDate?: string;
  confidence: number;
  rawText: string;
}

/**
 * 使用 Tesseract.js 提取護照資訊
 *
 * @param imagePath - 護照圖片路徑
 * @returns 護照資訊
 */
const extractWithTesseract = async (imagePath: string): Promise<PassportOcrResult> => {
  logger.info('開始 Tesseract OCR 識別', { imagePath });

  const result = await Tesseract.recognize(imagePath, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        logger.debug(`OCR 進度: ${(m.progress * 100).toFixed(2)}%`);
      }
    },
  });

  const text = result.data.text;
  const confidence = result.data.confidence;

  logger.info('Tesseract OCR 完成', {
    confidence,
    textLength: text.length,
  });

  // 解析護照文字
  const parsed = parsePassportText(text);

  return {
    ...parsed,
    confidence,
    rawText: text,
  };
};

/**
 * 解析護照 OCR 文字
 *
 * @param text - OCR 識別的文字
 * @returns 解析後的護照資訊
 */
const parsePassportText = (
  text: string
): Omit<PassportOcrResult, 'confidence' | 'rawText'> => {
  // 護照號碼模式 (通常是 9 位字母數字組合)
  const passportNumberMatch = text.match(/[A-Z]{1,2}\d{7,9}/);
  const passportNumber = passportNumberMatch?.[0] || '';

  // 姓名提取 (通常在 "Name" 或 "Surname" 後面)
  const nameMatch = text.match(/(?:Name|Surname)[:\s]+([A-Z\s]+)/i);
  const fullName = nameMatch?.[1]?.trim() || '';

  // 國籍提取
  const nationalityMatch = text.match(/(?:Nationality|Country)[:\s]+([A-Z\s]+)/i);
  const nationality = nationalityMatch?.[1]?.trim() || '';

  // 出生日期 (DD MMM YYYY 或 DD/MM/YYYY 格式)
  const dobMatch = text.match(
    /(?:Date of Birth|Birth)[:\s]+(\d{2}[\s\/]\w{3}[\s\/]\d{4}|\d{2}\/\d{2}\/\d{4})/i
  );
  const dateOfBirth = dobMatch?.[1]?.trim() || '';

  // 性別
  const genderMatch = text.match(/(?:Sex|Gender)[:\s]+([MF])/i);
  const gender = genderMatch?.[1]?.toUpperCase() || '';

  // 到期日
  const expiryMatch = text.match(
    /(?:Expiry|Date of Expiry)[:\s]+(\d{2}[\s\/]\w{3}[\s\/]\d{4}|\d{2}\/\d{2}\/\d{4})/i
  );
  const expiryDate = expiryMatch?.[1]?.trim() || '';

  // 簽發日期
  const issueMatch = text.match(
    /(?:Issue|Date of Issue)[:\s]+(\d{2}[\s\/]\w{3}[\s\/]\d{4}|\d{2}\/\d{2}\/\d{4})/i
  );
  const issueDate = issueMatch?.[1]?.trim() || undefined;

  return {
    passportNumber,
    fullName,
    nationality,
    dateOfBirth,
    gender,
    expiryDate,
    issueDate,
  };
};

/**
 * 提取護照資訊 (主函數)
 *
 * @param imagePath - 護照圖片路徑
 * @returns 護照資訊
 */
export const extractPassportData = async (
  imagePath: string
): Promise<PassportOcrResult> => {
  try {
    const result = await extractWithTesseract(imagePath);

    // 驗證必要欄位
    if (!result.passportNumber || !result.fullName) {
      logger.warn('護照 OCR 識別品質不佳', { result });

      // 返回部分識別結果，讓前端決定如何處理
      return {
        passportNumber: result.passportNumber || '',
        fullName: result.fullName || '',
        nationality: result.nationality || '',
        dateOfBirth: result.dateOfBirth || '',
        gender: result.gender || '',
        expiryDate: result.expiryDate || '',
        issueDate: result.issueDate,
        confidence: result.confidence,
        rawText: result.rawText,
      };
    }

    return result;
  } catch (error) {
    logger.error('護照 OCR 識別失敗', { error, imagePath });

    // 完全失敗時返回空資料
    return {
      passportNumber: '',
      fullName: '',
      nationality: '',
      dateOfBirth: '',
      gender: '',
      expiryDate: '',
      confidence: 0,
      rawText: '',
    };
  }
};

/**
 * 驗證護照 OCR 結果
 *
 * @param ocrResult - OCR 識別結果
 * @returns 是否有效
 */
export const validatePassportOcr = (ocrResult: PassportOcrResult): boolean => {
  // 檢查必要欄位
  if (!ocrResult.passportNumber || !ocrResult.fullName) {
    return false;
  }

  // 檢查護照號碼格式 (至少 6 個字元)
  if (ocrResult.passportNumber.length < 6) {
    return false;
  }

  // 檢查信心度 (建議 > 60)
  if (ocrResult.confidence < 60) {
    logger.warn('護照 OCR 信心度較低', { confidence: ocrResult.confidence });
  }

  return true;
};

/**
 * 檢查護照是否過期
 *
 * @param expiryDate - 到期日期字串
 * @returns 是否過期
 */
export const isPassportExpired = (expiryDate: string): boolean => {
  try {
    // 嘗試解析日期 (DD/MM/YYYY 或 DD MMM YYYY 格式)
    const parts = expiryDate.split(/[\s\/]/);

    if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
      const day = parseInt(parts[0]);
      const month = parts[1].length > 2 ? parseMonthName(parts[1]) : parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);

      const expiry = new Date(year, month, day);
      const now = new Date();

      return expiry < now;
    }

    return false;
  } catch (error) {
    logger.error('解析護照到期日期失敗', { error, expiryDate });
    return false;
  }
};

/**
 * 解析月份名稱為數字
 *
 * @param monthName - 月份名稱 (例如 JAN, FEB)
 * @returns 月份數字 (0-11)
 */
const parseMonthName = (monthName: string): number => {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];
  const index = months.indexOf(monthName.toUpperCase().substring(0, 3));
  return index >= 0 ? index : 0;
};
