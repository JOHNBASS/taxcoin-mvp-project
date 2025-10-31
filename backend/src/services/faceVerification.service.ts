/**
 * 臉部辨識驗證服務
 *
 * 簡化版實作 - 主要驗證圖片存在性和基本格式
 * 生產環境建議整合第三方服務如 AWS Rekognition, Azure Face API 等
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger.js';

/**
 * 臉部驗證結果
 */
export interface FaceVerificationResult {
  isValid: boolean;
  confidence: number;
  message: string;
  details?: {
    faceDetected: boolean;
    imageQuality: string;
    matchScore?: number;
  };
}

/**
 * 檢查圖片檔案是否存在且有效
 *
 * @param imagePath - 圖片路徑
 * @returns 是否有效
 */
const checkImageFile = async (imagePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(imagePath);

    // 檢查檔案大小 (應該在 1KB ~ 10MB 之間)
    // 現代圖片壓縮技術可以將照片壓縮到很小的尺寸
    if (stats.size < 1 * 1024 || stats.size > 10 * 1024 * 1024) {
      logger.warn('圖片檔案大小異常', {
        path: imagePath,
        size: stats.size,
        sizeKB: `${(stats.size / 1024).toFixed(2)} KB`
      });
      return false;
    }

    // 檢查副檔名
    const ext = path.extname(imagePath).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      logger.warn('不支援的圖片格式', { path: imagePath, ext });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('檢查圖片檔案失敗', { error, imagePath });
    return false;
  }
};

/**
 * 模擬臉部檢測
 * (生產環境應使用真實的 AI 服務)
 *
 * @param imagePath - 臉部照片路徑
 * @returns 檢測結果
 */
const detectFace = async (imagePath: string): Promise<boolean> => {
  // 簡化版: 只檢查檔案是否存在
  const isValid = await checkImageFile(imagePath);

  if (isValid) {
    logger.info('臉部檢測通過 (簡化版)', { imagePath });
    return true;
  }

  return false;
};

/**
 * 模擬臉部比對
 * (生產環境應使用真實的 AI 服務比對護照照片與自拍照)
 *
 * @param passportImagePath - 護照照片路徑
 * @param selfieImagePath - 自拍照片路徑
 * @returns 比對分數 (0-100)
 */
const compareFaces = async (
  passportImagePath: string,
  selfieImagePath: string
): Promise<number> => {
  // 簡化版: 檢查兩張圖片都存在就給予高分
  const passportValid = await checkImageFile(passportImagePath);
  const selfieValid = await checkImageFile(selfieImagePath);

  if (passportValid && selfieValid) {
    // 模擬比對分數 (75-95 之間)
    const score = 75 + Math.random() * 20;
    logger.info('臉部比對完成 (簡化版)', {
      passportImagePath,
      selfieImagePath,
      score: score.toFixed(2),
    });
    return Math.round(score);
  }

  return 0;
};

/**
 * 驗證臉部照片 (單張)
 *
 * @param faceImagePath - 臉部照片路徑
 * @returns 驗證結果
 */
export const verifyFaceImage = async (
  faceImagePath: string
): Promise<FaceVerificationResult> => {
  try {
    logger.info('開始臉部驗證', { faceImagePath });

    // 檢查圖片檔案
    const imageValid = await checkImageFile(faceImagePath);
    if (!imageValid) {
      return {
        isValid: false,
        confidence: 0,
        message: '圖片檔案無效或格式不支援',
        details: {
          faceDetected: false,
          imageQuality: 'INVALID',
        },
      };
    }

    // 臉部檢測
    const faceDetected = await detectFace(faceImagePath);
    if (!faceDetected) {
      return {
        isValid: false,
        confidence: 0,
        message: '未檢測到臉部',
        details: {
          faceDetected: false,
          imageQuality: 'GOOD',
        },
      };
    }

    // 驗證通過
    return {
      isValid: true,
      confidence: 85,
      message: '臉部驗證通過',
      details: {
        faceDetected: true,
        imageQuality: 'GOOD',
      },
    };
  } catch (error) {
    logger.error('臉部驗證失敗', { error, faceImagePath });

    return {
      isValid: false,
      confidence: 0,
      message: '臉部驗證過程發生錯誤',
      details: {
        faceDetected: false,
        imageQuality: 'ERROR',
      },
    };
  }
};

/**
 * 驗證臉部比對 (護照照片 vs 自拍照)
 *
 * @param passportImagePath - 護照照片路徑
 * @param selfieImagePath - 自拍照片路徑
 * @returns 驗證結果
 */
export const verifyFaceMatch = async (
  passportImagePath: string,
  selfieImagePath: string
): Promise<FaceVerificationResult> => {
  try {
    logger.info('開始臉部比對', {
      passportImagePath,
      selfieImagePath,
    });

    // 檢查兩張圖片
    const passportValid = await checkImageFile(passportImagePath);
    const selfieValid = await checkImageFile(selfieImagePath);

    if (!passportValid || !selfieValid) {
      return {
        isValid: false,
        confidence: 0,
        message: '圖片檔案無效',
        details: {
          faceDetected: false,
          imageQuality: 'INVALID',
        },
      };
    }

    // 臉部比對
    const matchScore = await compareFaces(passportImagePath, selfieImagePath);

    // 比對分數閾值: 70
    if (matchScore >= 70) {
      return {
        isValid: true,
        confidence: matchScore,
        message: '臉部比對通過',
        details: {
          faceDetected: true,
          imageQuality: 'GOOD',
          matchScore,
        },
      };
    } else {
      return {
        isValid: false,
        confidence: matchScore,
        message: '臉部比對分數過低',
        details: {
          faceDetected: true,
          imageQuality: 'GOOD',
          matchScore,
        },
      };
    }
  } catch (error) {
    logger.error('臉部比對失敗', { error });

    return {
      isValid: false,
      confidence: 0,
      message: '臉部比對過程發生錯誤',
      details: {
        faceDetected: false,
        imageQuality: 'ERROR',
      },
    };
  }
};

/**
 * 獲取臉部驗證建議
 *
 * @param result - 驗證結果
 * @returns 建議訊息
 */
export const getFaceVerificationAdvice = (result: FaceVerificationResult): string[] => {
  const advice: string[] = [];

  if (!result.details?.faceDetected) {
    advice.push('請確保照片中包含清晰的臉部');
    advice.push('請移除墨鏡、口罩等遮蔽物');
  }

  if (result.details?.imageQuality === 'INVALID') {
    advice.push('請使用有效的圖片格式 (JPG, PNG, WebP)');
    advice.push('請確保圖片大小在 1KB ~ 10MB 之間');
  }

  if (result.details?.matchScore && result.details.matchScore < 70) {
    advice.push('自拍照與護照照片相似度不足');
    advice.push('請確保光線充足');
    advice.push('請正面拍攝,不要傾斜');
  }

  if (advice.length === 0) {
    advice.push('驗證通過,無需調整');
  }

  return advice;
};
