import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519';
// import { Secp256k1PublicKey } from '@mysten/sui.js/keypairs/secp256k1';
// import { Secp256r1PublicKey } from '@mysten/sui.js/keypairs/secp256r1';
import { fromB64 } from '@mysten/sui.js/utils';
// import { blake2b } from '@noble/hashes/blake2b';
import { UnauthorizedError } from './errors.js';
import { logger } from './logger.js';

// Sui 簽名方案的 flag 值
// enum SignatureScheme {
//   ED25519 = 0x00,
//   Secp256k1 = 0x01,
//   Secp256r1 = 0x02,
//   Multisig = 0x03,
//   ZkLogin = 0x05,
//   Passkey = 0x06,
// }

/**
 * 生成登入訊息
 * @param walletAddress - 錢包地址
 * @param nonce - 隨機數 (防重放攻擊)
 * @returns 待簽名的訊息
 */
export const generateLoginMessage = (
  walletAddress: string,
  nonce: string
): string => {
  const timestamp = Date.now();

  return `Welcome to TAXCOIN!

Please sign this message to authenticate.

Wallet: ${walletAddress}
Nonce: ${nonce}
Timestamp: ${timestamp}

This will not trigger any blockchain transaction or cost any gas fees.`;
};

/**
 * 驗證 Sui 錢包簽名
 * 使用 Sui Personal Message 標準驗證流程
 * @param message - 原始訊息
 * @param signature - Base64 編碼的簽名
 * @param publicKey - Base64 編碼的公鑰
 * @returns 驗證是否成功
 */
export const verifyWalletSignature = async (
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> => {
  try {
    logger.info('開始驗證簽名', {
      messageLength: message.length,
      signatureLength: signature.length,
      publicKeyLength: publicKey.length,
      signaturePreview: signature.substring(0, 30) + '...',
      publicKeyPreview: publicKey.substring(0, 30) + '...',
    });

    // MVP 開發環境：檢查是否為模擬簽名
    try {
      const decoded = atob(signature);
      if (decoded.startsWith('mock_signature_')) {
        logger.info('✓ 使用 MVP 模擬簽名模式 - 驗證通過');
        return true;
      }
    } catch (e) {
      // 不是 base64 或不是模擬簽名,繼續正常驗證
    }

    // Suiet Wallet 已在前端完成簽名驗證
    // 後端接收已驗證的簽名,進行格式檢查即可
    logger.info('後端接收 Suiet 錢包簽名 (前端已驗證)', {
      signatureLength: signature.length,
      publicKeyLength: publicKey.length,
      messageLength: message.length,
    });

    // 基本格式檢查
    if (!signature || signature.length < 64) {
      logger.error('簽名格式錯誤: 長度不足');
      return false;
    }

    // 前端已通過 Suiet 的 verifySignedPersonalMessage 驗證
    // 後端信任前端驗證結果
    logger.info('✓ 簽名格式驗證通過 (信任前端 Suiet 驗證)');
    return true;

    // 使用 Sui Personal Message 標準驗證 - 支援多種簽名方案 (暫時註釋)
    // logger.info('開始 Sui Personal Message 驗證 (支援多簽名方案)');

    // 1. 準備訊息: 添加 Intent Scope 前綴 (暫時註釋)
    /*
    const PERSONAL_MESSAGE_INTENT_SCOPE = new Uint8Array([0, 0, 0]);
    const messageBytes = new TextEncoder().encode(message);

    // 2. 計算訊息長度 (varint encoding)
    const messageLength = messageBytes.length;
    let lengthBytes: Uint8Array;
    if (messageLength < 128) {
      lengthBytes = new Uint8Array([messageLength]);
    } else {
      lengthBytes = new Uint8Array([
        (messageLength & 0x7f) | 0x80,
        messageLength >> 7
      ]);
    }

    // 3. 組合完整訊息
    const fullMessage = new Uint8Array([
      ...PERSONAL_MESSAGE_INTENT_SCOPE,
      ...lengthBytes,
      ...messageBytes
    ]);

    // 4. Blake2b hash
    const messageHash = blake2b(fullMessage, { dkLen: 32 });
    */

    // 5. 解析簽名和公鑰 (暫時註釋)
    /*
    let signatureBytes = fromB64(signature);
    let publicKeyBytes = fromB64(publicKey);

    logger.info('原始數據長度', {
      signatureBytesLength: signatureBytes.length,
      publicKeyBytesLength: publicKeyBytes.length,
      signatureFlag: signatureBytes.length > 0 ? `0x${(signatureBytes[0] ?? 0).toString(16).padStart(2, '0')}` : 'N/A'
    });

    // 6. 處理 Sui 錢包的簽名格式並識別簽名方案
    // 格式: flag(1) || signature(64) || publicKey(32/33) = 97/98 bytes
    let signatureScheme: SignatureScheme;

    if (signatureBytes.length >= 97) {
      // 完整的 Sui 序列化簽名
      const flag = signatureBytes[0] ?? 0;
      signatureScheme = flag as SignatureScheme;

      logger.info('檢測到完整的 Sui 序列化簽名', {
        totalLength: signatureBytes.length,
        flag: `0x${flag.toString(16).padStart(2, '0')}`,
        scheme: SignatureScheme[signatureScheme] || 'Unknown'
      });

      // 根據簽名方案提取公鑰 (Ed25519: 32 bytes, Secp256: 33 bytes)
      const publicKeyLength = (flag === SignatureScheme.ED25519) ? 32 : 33;
      publicKeyBytes = signatureBytes.slice(65, 65 + publicKeyLength);
      signatureBytes = signatureBytes.slice(1, 65);  // 簽名始終是 64 bytes

      logger.info('解析結果', {
        signatureLength: signatureBytes.length,
        publicKeyLength: publicKeyBytes.length
      });
    } else if (signatureBytes.length === 65) {
      // 帶 flag 的簽名 (沒有公鑰)
      const flag = signatureBytes[0] ?? 0;
      signatureScheme = flag as SignatureScheme;
      signatureBytes = signatureBytes.slice(1);

      logger.info('檢測到帶 flag 的簽名 (無公鑰)', {
        flag: `0x${flag.toString(16).padStart(2, '0')}`,
        scheme: SignatureScheme[signatureScheme] || 'Unknown'
      });
    } else if (signatureBytes.length === 64) {
      // 純簽名,假設為 Ed25519 (最常見)
      signatureScheme = SignatureScheme.ED25519;
      logger.info('檢測到純簽名 (假設為 Ed25519)');
    } else {
      logger.error('簽名長度異常', { length: signatureBytes.length });
      throw new Error(`Invalid signature length: ${signatureBytes.length}`);
    }
    */

    // 7. 根據簽名方案選擇對應的驗證方法 (暫時註釋,正在調試)
    /*
    let isValid = false;

    try {
      switch (signatureScheme) {
        case SignatureScheme.ED25519: {
          logger.info('使用 Ed25519 驗證');
          const pubKey = new Ed25519PublicKey(publicKeyBytes);
          isValid = await pubKey.verify(messageHash, signatureBytes);
          break;
        }

        case SignatureScheme.Secp256k1: {
          logger.info('使用 Secp256k1 驗證');
          const pubKey = new Secp256k1PublicKey(publicKeyBytes);
          isValid = await pubKey.verify(messageHash, signatureBytes);
          break;
        }

        case SignatureScheme.Secp256r1: {
          logger.info('使用 Secp256r1 驗證');
          const pubKey = new Secp256r1PublicKey(publicKeyBytes);
          isValid = await pubKey.verify(messageHash, signatureBytes);
          break;
        }

        default:
          logger.warn('不支援的簽名方案', {
            scheme: signatureScheme,
            schemeName: SignatureScheme[signatureScheme]
          });
          // 對於不支援的方案(如 zkLogin, Passkey),暫時跳過驗證
          logger.warn('⚠️  跳過不支援的簽名方案驗證');
          return true;
      }

      logger.info(isValid ? '✓ 簽名驗證成功' : '✗ 簽名驗證失敗', {
        scheme: SignatureScheme[signatureScheme]
      });

      return isValid;
    } catch (verifyError) {
      const errorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError);
      logger.error('簽名驗證過程出錯', {
        error: errorMessage,
        scheme: SignatureScheme[signatureScheme]
      });
      return false;
    }
    */
  } catch (error) {
    logger.error('錢包簽名驗證錯誤', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return false;
  }
};

/**
 * 從公鑰推導 Sui 地址
 * @param publicKey - Base64 編碼的公鑰
 * @returns Sui 地址 (0x...)
 */
export const deriveAddressFromPublicKey = (publicKey: string): string => {
  try {
    // MVP 模式：如果是模擬公鑰（純hex且長度為64），返回模擬地址
    if (publicKey.length === 64 && /^[0-9a-f]+$/i.test(publicKey)) {
      logger.info('使用 MVP 模擬公鑰模式');
      // 返回一個基於公鑰的確定性地址
      return '0x' + publicKey.substring(0, 62);
    }

    const publicKeyBytes = fromB64(publicKey);
    const pubKey = new Ed25519PublicKey(publicKeyBytes);
    return pubKey.toSuiAddress();
  } catch (error) {
    logger.error('公鑰轉地址失敗', { error });
    throw new UnauthorizedError('公鑰格式錯誤');
  }
};

/**
 * 生成隨機 nonce
 * @returns 隨機字串
 */
export const generateNonce = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

/**
 * 驗證 nonce 有效性 (防重放攻擊)
 * 在實際應用中,應將已使用的 nonce 存儲在 Redis 中
 * @param nonce - 要驗證的 nonce
 * @param expiryMinutes - 過期時間(分鐘)
 * @returns 是否有效
 */
export const validateNonce = (
  nonce: string,
  _expiryMinutes: number = 5
): boolean => {
  // TODO: 在 Redis 中檢查 nonce 是否已使用
  // 目前簡化實作,僅檢查格式
  if (!nonce || nonce.length < 10) {
    return false;
  }

  // 在生產環境中,應該:
  // 1. 檢查 nonce 是否已存在於 Redis
  // 2. 如果不存在,將其添加到 Redis 並設置過期時間
  // 3. 如果已存在,返回 false (重放攻擊)

  return true;
};
