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
export declare const verifyFaceImage: (faceImagePath: string) => Promise<FaceVerificationResult>;
export declare const verifyFaceMatch: (passportImagePath: string, selfieImagePath: string) => Promise<FaceVerificationResult>;
export declare const getFaceVerificationAdvice: (result: FaceVerificationResult) => string[];
//# sourceMappingURL=faceVerification.service.d.ts.map