/**
 * JWT 工具函數單元測試
 */

import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, extractToken, refreshToken } from '../jwt.js';
import { UnauthorizedError } from '../errors.js';
import { JwtPayload } from '@/types/index.js';
import { config } from '@/config.js';

describe('JWT Utils', () => {
  const mockPayload: JwtPayload = {
    userId: 'user-123',
    did: 'did:example:123456',
    role: 'INVESTOR',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct payload data', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.did).toBe(mockPayload.did);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should include issuer and audience', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iss).toBe('taxcoin-api');
      expect(decoded.aud).toBe('taxcoin-client');
    });

    it('should set expiration time', () => {
      const token = generateToken(mockPayload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.did).toBe(mockPayload.did);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should throw UnauthorizedError for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyToken(invalidToken)).toThrow(UnauthorizedError);
      expect(() => verifyToken(invalidToken)).toThrow('Token 無效');
    });

    it('should throw UnauthorizedError for expired token', () => {
      // Generate token with 0 second expiration
      const expiredToken = jwt.sign(mockPayload, config.jwt.secret, {
        expiresIn: '0s',
        issuer: 'taxcoin-api',
        audience: 'taxcoin-client',
      });

      // Wait for token to expire
      setTimeout(() => {
        expect(() => verifyToken(expiredToken)).toThrow(UnauthorizedError);
        expect(() => verifyToken(expiredToken)).toThrow('Token 已過期');
      }, 1000);
    });

    it('should throw UnauthorizedError for token with wrong issuer', () => {
      const wrongIssuerToken = jwt.sign(mockPayload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'wrong-issuer',
        audience: 'taxcoin-client',
      });

      expect(() => verifyToken(wrongIssuerToken)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for token with wrong audience', () => {
      const wrongAudienceToken = jwt.sign(mockPayload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        issuer: 'taxcoin-api',
        audience: 'wrong-audience',
      });

      expect(() => verifyToken(wrongAudienceToken)).toThrow(UnauthorizedError);
    });
  });

  describe('extractToken', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'some.jwt.token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractToken(authHeader);

      expect(extracted).toBe(token);
    });

    it('should throw UnauthorizedError when header is missing', () => {
      expect(() => extractToken()).toThrow(UnauthorizedError);
      expect(() => extractToken()).toThrow('缺少 Authorization header');
    });

    it('should throw UnauthorizedError when header is empty', () => {
      expect(() => extractToken('')).toThrow(UnauthorizedError);
      expect(() => extractToken('')).toThrow('缺少 Authorization header');
    });

    it('should throw UnauthorizedError when header format is wrong', () => {
      expect(() => extractToken('InvalidFormat')).toThrow(UnauthorizedError);
      expect(() => extractToken('InvalidFormat')).toThrow('Authorization header 格式錯誤');
    });

    it('should throw UnauthorizedError when scheme is not Bearer', () => {
      expect(() => extractToken('Basic some.token')).toThrow(UnauthorizedError);
      expect(() => extractToken('Basic some.token')).toThrow('Authorization header 格式錯誤');
    });

    it('should throw UnauthorizedError when token is missing', () => {
      expect(() => extractToken('Bearer')).toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh a valid token', () => {
      const oldToken = generateToken(mockPayload);
      const newToken = refreshToken(oldToken);

      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(oldToken);

      const decoded = verifyToken(newToken);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.did).toBe(mockPayload.did);
      expect(decoded.role).toBe(mockPayload.role);
    });

    it('should refresh an expired token', () => {
      const expiredToken = jwt.sign(mockPayload, config.jwt.secret, {
        expiresIn: '0s',
        issuer: 'taxcoin-api',
        audience: 'taxcoin-client',
      });

      // Wait for expiration
      setTimeout(() => {
        const newToken = refreshToken(expiredToken);

        expect(newToken).toBeDefined();
        const decoded = verifyToken(newToken);
        expect(decoded.userId).toBe(mockPayload.userId);
      }, 1000);
    });

    it('should throw UnauthorizedError for invalid token', () => {
      expect(() => refreshToken('invalid.token')).toThrow(UnauthorizedError);
      expect(() => refreshToken('invalid.token')).toThrow('Token 刷新失敗');
    });

    it('should generate new token with same payload data', () => {
      const oldToken = generateToken(mockPayload);
      const newToken = refreshToken(oldToken);

      const oldDecoded = jwt.decode(oldToken) as any;
      const newDecoded = jwt.decode(newToken) as any;

      expect(newDecoded.userId).toBe(oldDecoded.userId);
      expect(newDecoded.did).toBe(oldDecoded.did);
      expect(newDecoded.role).toBe(oldDecoded.role);
      expect(newDecoded.iat).toBeGreaterThan(oldDecoded.iat);
    });
  });
});
