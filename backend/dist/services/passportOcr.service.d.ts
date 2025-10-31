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
export declare const extractPassportData: (imagePath: string) => Promise<PassportOcrResult>;
export declare const validatePassportOcr: (ocrResult: PassportOcrResult) => boolean;
export declare const isPassportExpired: (expiryDate: string) => boolean;
//# sourceMappingURL=passportOcr.service.d.ts.map