/**
 * 錢包工具函數單元測試
 */

import {
  generateLoginMessage,
  generateNonce,
  validateNonce,
  deriveAddressFromPublicKey,
  verifyWalletSignature,
} from '../wallet.js';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { UnauthorizedError } from '../errors.js';

describe('Wallet Utils', () => {
  describe('generateLoginMessage', () => {
    it('should generate a login message with wallet address and nonce', () => {
      const walletAddress = '0x1234567890abcdef';
      const nonce = 'test-nonce-123';

      const message = generateLoginMessage(walletAddress, nonce);

      expect(message).toContain('Welcome to TAXCOIN!');
      expect(message).toContain(`Wallet: ${walletAddress}`);
      expect(message).toContain(`Nonce: ${nonce}`);
      expect(message).toContain('Timestamp:');
      expect(message).toContain('This will not trigger any blockchain transaction');
    });

    it('should include timestamp in message', () => {
      const walletAddress = '0x1234567890abcdef';
      const nonce = 'test-nonce-123';

      const beforeTimestamp = Date.now();
      const message = generateLoginMessage(walletAddress, nonce);
      const afterTimestamp = Date.now();

      const timestampMatch = message.match(/Timestamp: (\d+)/);
      expect(timestampMatch).toBeTruthy();

      const messageTimestamp = parseInt(timestampMatch![1]);
      expect(messageTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(messageTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should generate different timestamps for different calls', (done) => {
      const walletAddress = '0x1234567890abcdef';
      const nonce = 'test-nonce-123';

      const message1 = generateLoginMessage(walletAddress, nonce);

      setTimeout(() => {
        const message2 = generateLoginMessage(walletAddress, nonce);
        expect(message1).not.toBe(message2);
        done();
      }, 10);
    });
  });

  describe('generateNonce', () => {
    it('should generate a nonce', () => {
      const nonce = generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(10);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      const nonce3 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
      expect(nonce2).not.toBe(nonce3);
      expect(nonce1).not.toBe(nonce3);
    });

    it('should generate alphanumeric nonces', () => {
      const nonce = generateNonce();

      // Should only contain alphanumeric characters
      expect(nonce).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe('validateNonce', () => {
    it('should validate a valid nonce', () => {
      const validNonce = 'abcdefghij1234567890';

      const isValid = validateNonce(validNonce);

      expect(isValid).toBe(true);
    });

    it('should reject empty nonce', () => {
      expect(validateNonce('')).toBe(false);
    });

    it('should reject undefined nonce', () => {
      expect(validateNonce(undefined as any)).toBe(false);
    });

    it('should reject short nonce', () => {
      const shortNonce = 'abc'; // Less than 10 characters

      expect(validateNonce(shortNonce)).toBe(false);
    });

    it('should accept nonce with default expiry', () => {
      const nonce = generateNonce();

      expect(validateNonce(nonce)).toBe(true);
    });

    it('should accept nonce with custom expiry', () => {
      const nonce = generateNonce();

      expect(validateNonce(nonce, 10)).toBe(true);
    });
  });

  describe('deriveAddressFromPublicKey', () => {
    it('should derive Sui address from valid public key', () => {
      const keypair = new Ed25519Keypair();
      const publicKey = keypair.getPublicKey().toBase64();

      const address = deriveAddressFromPublicKey(publicKey);

      expect(address).toBeDefined();
      expect(address).toMatch(/^0x[a-f0-9]+$/);
    });

    it('should throw UnauthorizedError for invalid public key', () => {
      const invalidPublicKey = 'invalid-base64-key';

      expect(() => deriveAddressFromPublicKey(invalidPublicKey)).toThrow(
        UnauthorizedError
      );
      expect(() => deriveAddressFromPublicKey(invalidPublicKey)).toThrow(
        '公鑰格式錯誤'
      );
    });

    it('should derive same address for same public key', () => {
      const keypair = new Ed25519Keypair();
      const publicKey = keypair.getPublicKey().toBase64();

      const address1 = deriveAddressFromPublicKey(publicKey);
      const address2 = deriveAddressFromPublicKey(publicKey);

      expect(address1).toBe(address2);
    });

    it('should derive different addresses for different public keys', () => {
      const keypair1 = new Ed25519Keypair();
      const keypair2 = new Ed25519Keypair();

      const publicKey1 = keypair1.getPublicKey().toBase64();
      const publicKey2 = keypair2.getPublicKey().toBase64();

      const address1 = deriveAddressFromPublicKey(publicKey1);
      const address2 = deriveAddressFromPublicKey(publicKey2);

      expect(address1).not.toBe(address2);
    });
  });

  describe('verifyWalletSignature', () => {
    it('should verify valid signature', () => {
      const keypair = new Ed25519Keypair();
      const message = 'Test message for signing';
      const messageBytes = new TextEncoder().encode(message);

      const signature = keypair.signData(messageBytes);
      const publicKey = keypair.getPublicKey().toBase64();

      const isValid = verifyWalletSignature(
        message,
        Buffer.from(signature).toString('base64'),
        publicKey
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const keypair = new Ed25519Keypair();
      const message = 'Test message';
      const invalidSignature = 'invalid-signature';
      const publicKey = keypair.getPublicKey().toBase64();

      const isValid = verifyWalletSignature(message, invalidSignature, publicKey);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong message', () => {
      const keypair = new Ed25519Keypair();
      const originalMessage = 'Original message';
      const tamperedMessage = 'Tampered message';
      const messageBytes = new TextEncoder().encode(originalMessage);

      const signature = keypair.signData(messageBytes);
      const publicKey = keypair.getPublicKey().toBase64();

      const isValid = verifyWalletSignature(
        tamperedMessage,
        Buffer.from(signature).toString('base64'),
        publicKey
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong public key', () => {
      const keypair1 = new Ed25519Keypair();
      const keypair2 = new Ed25519Keypair();
      const message = 'Test message';
      const messageBytes = new TextEncoder().encode(message);

      const signature = keypair1.signData(messageBytes);
      const wrongPublicKey = keypair2.getPublicKey().toBase64();

      const isValid = verifyWalletSignature(
        message,
        Buffer.from(signature).toString('base64'),
        wrongPublicKey
      );

      expect(isValid).toBe(false);
    });

    it('should handle invalid public key format', () => {
      const message = 'Test message';
      const signature = 'some-signature';
      const invalidPublicKey = 'invalid-base64';

      const isValid = verifyWalletSignature(message, signature, invalidPublicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('Integration: generateLoginMessage + verifyWalletSignature', () => {
    it('should verify signature for generated login message', () => {
      const keypair = new Ed25519Keypair();
      const walletAddress = keypair.getPublicKey().toSuiAddress();
      const nonce = generateNonce();

      // Generate login message
      const message = generateLoginMessage(walletAddress, nonce);

      // Sign message
      const messageBytes = new TextEncoder().encode(message);
      const signature = keypair.signData(messageBytes);
      const publicKey = keypair.getPublicKey().toBase64();

      // Verify signature
      const isValid = verifyWalletSignature(
        message,
        Buffer.from(signature).toString('base64'),
        publicKey
      );

      expect(isValid).toBe(true);
    });
  });
});
