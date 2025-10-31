/**
 * 認證 API 整合測試
 */

import request from 'supertest';
import { app } from '@/server.js';
import { prismaMock } from '@/__tests__/setup.js';
import { generateToken } from '@/utils/jwt.js';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce, generateLoginMessage } from '@/utils/wallet.js';

describe('Auth API Integration Tests', () => {
  describe('POST /api/v1/auth/nonce', () => {
    it('should generate nonce for wallet address', async () => {
      const walletAddress = '0x1234567890abcdef';

      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nonce).toBeDefined();
      expect(response.body.data.message).toContain('Welcome to TAXCOIN!');
      expect(response.body.data.message).toContain(walletAddress);
    });

    it('should return 400 for missing wallet address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid wallet address format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid wallet signature for existing user', async () => {
      const keypair = new Ed25519Keypair();
      const walletAddress = keypair.getPublicKey().toSuiAddress();
      const publicKey = keypair.getPublicKey().toBase64();
      const nonce = generateNonce();
      const message = generateLoginMessage(walletAddress, nonce);
      const messageBytes = new TextEncoder().encode(message);
      const signature = Buffer.from(keypair.signData(messageBytes)).toString('base64');

      const mockUser = {
        id: 'user-123',
        walletAddress,
        email: null,
        role: 'INVESTOR',
        kycStatus: 'VERIFIED',
        balance: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          walletAddress,
          signature,
          publicKey,
          message,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.walletAddress).toBe(walletAddress);
      expect(response.body.data.user.role).toBe('INVESTOR');
    });

    it('should create new user for first-time login', async () => {
      const keypair = new Ed25519Keypair();
      const walletAddress = keypair.getPublicKey().toSuiAddress();
      const publicKey = keypair.getPublicKey().toBase64();
      const nonce = generateNonce();
      const message = generateLoginMessage(walletAddress, nonce);
      const messageBytes = new TextEncoder().encode(message);
      const signature = Buffer.from(keypair.signData(messageBytes)).toString('base64');

      const newUser = {
        id: 'user-new',
        walletAddress,
        email: null,
        role: 'TOURIST',
        kycStatus: 'UNVERIFIED',
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(newUser as any);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          walletAddress,
          signature,
          publicKey,
          message,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('TOURIST');
      expect(response.body.data.user.kycStatus).toBe('UNVERIFIED');
      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should return 401 for invalid signature', async () => {
      const walletAddress = '0x1234567890abcdef';
      const invalidSignature = 'invalid-signature';
      const publicKey = 'invalid-public-key';
      const message = 'Test message';

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          walletAddress,
          signature: invalidSignature,
          publicKey,
          message,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          walletAddress: '0x123',
          // Missing signature, publicKey, message
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        walletAddress: '0x1234567890abcdef',
        email: 'test@example.com',
        role: 'INVESTOR',
        kycStatus: 'VERIFIED',
        balance: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = generateToken({
        userId: mockUser.id,
        did: mockUser.walletAddress,
        role: mockUser.role,
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(mockUser.id);
      expect(response.body.data.walletAddress).toBe(mockUser.walletAddress);
      expect(response.body.data.role).toBe(mockUser.role);
    });

    it('should return 401 without token', async () => {
      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when user not found', async () => {
      const token = generateToken({
        userId: 'non-existent',
        did: '0x123',
        role: 'INVESTOR',
      });

      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token with valid old token', async () => {
      const mockUser = {
        id: 'user-123',
        walletAddress: '0x1234567890abcdef',
        role: 'INVESTOR',
      };

      const oldToken = generateToken({
        userId: mockUser.id,
        did: mockUser.walletAddress,
        role: mockUser.role,
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ token: oldToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(oldToken);
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
