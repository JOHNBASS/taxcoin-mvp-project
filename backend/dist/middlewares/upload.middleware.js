import multer from 'multer';
import path from 'path';
import { config } from '../config/index.js';
import { ValidationError } from '../utils/errors.js';
const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];
const MAX_FILE_SIZE = config.upload.maxFileSize;
const imageFilter = (_req, file, callback) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return callback(new ValidationError(`不支援的檔案格式: ${file.mimetype}。僅支援 JPEG, PNG, WebP`));
    }
    callback(null, true);
};
const storage = multer.diskStorage({
    destination: (req, _file, callback) => {
        let folder = 'general';
        if (req.path.includes('receipt')) {
            folder = 'receipts';
        }
        else if (req.path.includes('kyc')) {
            folder = 'kyc';
        }
        else if (req.path.includes('passport')) {
            folder = 'passport';
        }
        else if (req.path.includes('face')) {
            folder = 'face';
        }
        const uploadPath = path.join(config.upload.uploadDir, folder);
        callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
        const userId = req.user?.userId || 'anonymous';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname);
        const filename = `${timestamp}-${userId}-${random}${ext}`;
        callback(null, filename);
    },
});
export const uploadSingle = (fieldName) => {
    return multer({
        storage,
        fileFilter: imageFilter,
        limits: {
            fileSize: MAX_FILE_SIZE,
        },
    }).single(fieldName);
};
export const uploadMultiple = (fieldName, maxCount = 5) => {
    return multer({
        storage,
        fileFilter: imageFilter,
        limits: {
            fileSize: MAX_FILE_SIZE,
            files: maxCount,
        },
    }).array(fieldName, maxCount);
};
export const uploadFields = (fields) => {
    return multer({
        storage,
        fileFilter: imageFilter,
        limits: {
            fileSize: MAX_FILE_SIZE,
        },
    }).fields(fields);
};
export const handleUploadError = (error, _req, _res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return next(new ValidationError(`檔案大小超過限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`));
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
//# sourceMappingURL=upload.middleware.js.map