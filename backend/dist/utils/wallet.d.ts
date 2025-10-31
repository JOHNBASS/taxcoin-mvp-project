export declare const generateLoginMessage: (walletAddress: string, nonce: string) => string;
export declare const verifyWalletSignature: (message: string, signature: string, publicKey: string) => Promise<boolean>;
export declare const deriveAddressFromPublicKey: (publicKey: string) => string;
export declare const generateNonce: () => string;
export declare const validateNonce: (nonce: string, _expiryMinutes?: number) => boolean;
//# sourceMappingURL=wallet.d.ts.map