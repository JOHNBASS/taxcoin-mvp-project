import { OcrResult } from '../types/index.js';
export declare const extractReceiptData: (imagePath: string) => Promise<OcrResult>;
export declare const extractMultipleReceipts: (imagePaths: string[]) => Promise<OcrResult[]>;
export declare const validateOcrResult: (ocrResult: OcrResult) => boolean;
//# sourceMappingURL=ocr.service.d.ts.map