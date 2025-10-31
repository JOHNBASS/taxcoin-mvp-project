import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { UnauthorizedError } from './errors';
import { logger } from './logger';
export const generateLoginMessage = (walletAddress, nonce) => {
    const timestamp = Date.now();
    return `Welcome to TAXCOIN!

Please sign this message to authenticate.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}

This will not trigger any blockchain transaction or cost any gas fees.`;
};
export const verifyWalletSignature = async (message, signature, publicKey) => {
    try {
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = fromB64(signature);
        const publicKeyBytes = fromB64(publicKey);
        const pubKey = new Ed25519PublicKey(publicKeyBytes);
        const isValid = await pubKey.verify(messageBytes, signatureBytes);
        if (!isValid) {
            logger.warn('錢包簽名驗證失敗', {
                publicKey: publicKey.substring(0, 10) + '...',
            });
        }
        return isValid;
    }
    catch (error) {
        logger.error('錢包簽名驗證錯誤', { error });
        return false;
    }
};
export const deriveAddressFromPublicKey = (publicKey) => {
    try {
        const publicKeyBytes = fromB64(publicKey);
        const pubKey = new Ed25519PublicKey(publicKeyBytes);
        return pubKey.toSuiAddress();
    }
    catch (error) {
        logger.error('公鑰轉地址失敗', { error });
        throw new UnauthorizedError('公鑰格式錯誤');
    }
};
export const generateNonce = () => {
    return (Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15));
};
export const validateNonce = (nonce, _expiryMinutes = 5) => {
    if (!nonce || nonce.length < 10) {
        return false;
    }
    return true;
};
//# sourceMappingURL=wallet.js.map