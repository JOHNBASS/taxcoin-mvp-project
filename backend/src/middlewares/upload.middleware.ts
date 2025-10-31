import multer from 'multer';
import path from 'path';
import { config } from '@/config/index.js';
import { ValidationError } from '@/utils/errors.js';
import { Request } from 'express';

// 允許的圖片格式
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// 允許的檔案大小 (5MB)
const MAX_FILE_SIZE = config.upload.maxFileSize;

/**
 * 檔案過濾器 - 僅允許圖片
 */
const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return callback(
      new ValidationError(
        `不支援的檔案格式: ${file.mimetype}。僅支援 JPEG, PNG, WebP`
      )
    );
  }

  callback(null, true);
};

/**
 * 檔案命名策略
 */
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // 根據 field name 或上傳路徑決定目錄
    let folder = 'general';

    // 優先根據 field name 判斷
    if (file.fieldname === 'receipts') {
      folder = 'receipts';
    } else if (file.fieldname === 'passport' || file.fieldname === 'passportPhoto') {
      folder = 'passport';
    } else if (file.fieldname === 'selfie' || file.fieldname === 'facePhoto') {
      folder = 'face';
    }
    // 後備方案：根據路徑判斷
    else if (req.path.includes('receipt')) {
      folder = 'receipts';
    } else if (req.path.includes('kyc')) {
      folder = 'kyc';
    } else if (req.path.includes('passport')) {
      folder = 'passport';
    } else if (req.path.includes('face')) {
      folder = 'face';
    }

    const uploadPath = path.join(config.upload.uploadDir, folder);
    callback(null, uploadPath);
  },
  filename: (req, file, callback) => {
    // 生成唯一檔名: {timestamp}-{userId}-{random}.{ext}
    const userId = (req as any).user?.userId || 'anonymous';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${userId}-${random}${ext}`;

    callback(null, filename);
  },
});

/**
 * Multer 配置 - 單檔上傳
 */
export const uploadSingle = (fieldName: string) => {
  return multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  }).single(fieldName);
};

/**
 * Multer 配置 - 多檔上傳
 */
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => {
  return multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

/**
 * Multer 配置 - 多個欄位上傳
 */
export const uploadFields = (
  fields: Array<{ name: string; maxCount: number }>
) => {
  return multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  }).fields(fields);
};

/**
 * 錯誤處理中間件 - 處理 Multer 錯誤
 */
export const handleUploadError = (
  error: any,
  _req: Request,
  _res: any,
  next: any
) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ValidationError(
          `檔案大小超過限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`
        )
      );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationError('上傳檔案數量超過限制'));
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('未預期的檔案欄位'));
    }

    return next(new ValidationError(`檔案上傳錯誤: ${error.message}`));
  }

  next(error);
};
