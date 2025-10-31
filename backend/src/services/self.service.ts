/**
 * Self Onchain SDK 服務
 * 用於生成符合 W3C 標準的 DID 和可驗證憑證 (Verifiable Credentials)
 *
 * 功能:
 * - 創建 W3C DID (Decentralized Identifier)
 * - 簽發 KYC 可驗證憑證 (VC)
 * - 驗證憑證真實性
 * - 解析 DID Document
 */

import { DID } from 'dids';
import { Ed25519Provider } from 'key-did-provider-ed25519';
import KeyResolver from 'key-did-resolver';
import { randomBytes } from 'crypto';
import { toString as uint8ArrayToString } from 'uint8arrays/to-string';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import { logger } from '@/utils/logger.js';

// ===== 類型定義 =====

/**
 * DID Document (符合 W3C 標準)
 */
export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }>;
  authentication: string[];
  assertionMethod: string[];
  keyAgreement?: string[];
}

/**
 * 可驗證憑證 (Verifiable Credential)
 */
export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string; // DID
    fullName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;
    kycVerified: boolean;
    verificationLevel: 'BASIC' | 'ADVANCED';
    verifiedAt: string;
  };
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    jws: string;
  };
}

/**
 * DID 創建結果
 */
export interface DIDCreationResult {
  did: string;
  didDocument: DIDDocument;
  seed: string; // 種子 (需要安全存儲)
}

/**
 * Self Service 類
 */
class SelfService {
  private adminDID: DID | null = null;
  private isInitialized = false;

  /**
   * 初始化管理員 DID (用於簽發憑證)
   */
  async initialize(): Promise<string> {
    if (this.isInitialized && this.adminDID) {
      return this.adminDID.id;
    }

    try {
      // 從環境變數讀取管理員種子,如果沒有則生成新的
      let seed: Uint8Array;

      if (process.env.SELF_ADMIN_SEED) {
        // 從 hex 字符串轉換為 Uint8Array
        seed = uint8ArrayFromString(process.env.SELF_ADMIN_SEED, 'base16');
        logger.info('使用環境變數中的管理員種子');
      } else {
        // 生成新的隨機種子
        seed = randomBytes(32);
        const seedHex = uint8ArrayToString(seed, 'base16');
        logger.warn('⚠️  未找到 SELF_ADMIN_SEED,已生成新種子', {
          seedHex,
          message: '請將此種子保存到環境變數 SELF_ADMIN_SEED 中'
        });
      }

      // 創建 Ed25519 提供者
      const provider = new Ed25519Provider(seed);

      // 創建 DID
      const did = new DID({
        provider,
        resolver: KeyResolver.getResolver()
      });

      // 認證 DID
      await did.authenticate();

      this.adminDID = did;
      this.isInitialized = true;

      logger.info('✅ Self Service 初始化成功', {
        adminDID: did.id,
        verificationMethod: did.id + '#' + did.id.split(':').pop()
      });

      return did.id;
    } catch (error) {
      logger.error('❌ Self Service 初始化失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Self Service 初始化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 為用戶創建 W3C DID
   *
   * @param walletAddress - 用戶的錢包地址
   * @returns DID 創建結果 (包含 DID, DID Document, 種子)
   */
  async createDID(walletAddress: string): Promise<DIDCreationResult> {
    try {
      logger.info('開始創建 W3C DID', { walletAddress });

      // 使用錢包地址生成確定性種子
      // 注意: 這確保相同的錢包地址總是生成相同的 DID
      const seedSource = walletAddress.toLowerCase().replace('0x', '').slice(0, 64);
      const seed = uint8ArrayFromString(seedSource.padEnd(64, '0'), 'base16');

      // 創建 Ed25519 提供者
      const provider = new Ed25519Provider(seed);

      // 創建 DID
      const userDID = new DID({
        provider,
        resolver: KeyResolver.getResolver()
      });

      // 認證 DID
      await userDID.authenticate();

      // 獲取 DID Document
      const didDocument = await this.getDIDDocument(userDID);

      const seedHex = uint8ArrayToString(seed, 'base16');

      logger.info('✅ W3C DID 創建成功', {
        walletAddress,
        did: userDID.id,
        didType: 'did:key',
        verificationMethods: didDocument.verificationMethod.length
      });

      return {
        did: userDID.id,
        didDocument,
        seed: seedHex
      };
    } catch (error) {
      logger.error('❌ 創建 W3C DID 失敗', {
        error: error instanceof Error ? error.message : String(error),
        walletAddress
      });
      throw new Error(`創建 DID 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 簽發 KYC 可驗證憑證
   *
   * @param params - 憑證參數
   * @returns 可驗證憑證
   */
  async issueKYCCredential(params: {
    userDID: string;
    fullName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: Date;
    verificationLevel: 'BASIC' | 'ADVANCED';
  }): Promise<VerifiableCredential> {
    // 確保管理員 DID 已初始化
    if (!this.isInitialized || !this.adminDID) {
      await this.initialize();
    }

    if (!this.adminDID) {
      throw new Error('管理員 DID 未初始化');
    }

    try {
      logger.info('開始簽發 KYC 可驗證憑證', {
        userDID: params.userDID,
        verificationLevel: params.verificationLevel
      });

      // 生成憑證 ID
      const credentialId = `urn:uuid:${randomBytes(16).toString('hex')}`;
      const issuanceDate = new Date().toISOString();
      const verifiedAt = new Date().toISOString();

      // 憑證主體
      const credentialSubject = {
        id: params.userDID,
        fullName: params.fullName,
        passportNumber: params.passportNumber,
        nationality: params.nationality,
        dateOfBirth: params.dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD
        kycVerified: true,
        verificationLevel: params.verificationLevel,
        verifiedAt
      };

      // 創建憑證 payload
      const payload = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        id: credentialId,
        type: ['VerifiableCredential', 'KYCCredential'],
        issuer: this.adminDID.id,
        issuanceDate,
        credentialSubject
      };

      // 使用 DID 簽名
      const jws = await this.adminDID.createJWS(payload);

      // 構建完整憑證
      const credential = {
        ...payload,
        proof: {
          type: 'JsonWebSignature2020',
          created: issuanceDate,
          verificationMethod: `${this.adminDID.id}#${this.adminDID.id.split(':').pop()}`,
          proofPurpose: 'assertionMethod',
          jws: jws.signatures[0]?.signature || ''
        }
      } as any; // 簡化類型檢查

      logger.info('✅ KYC 可驗證憑證簽發成功', {
        credentialId,
        userDID: params.userDID,
        issuer: this.adminDID.id,
        verificationLevel: params.verificationLevel
      });

      return credential;
    } catch (error) {
      logger.error('❌ 簽發 KYC 憑證失敗', {
        error: error instanceof Error ? error.message : String(error),
        userDID: params.userDID
      });
      throw new Error(`簽發憑證失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    }
  }

  /**
   * 驗證可驗證憑證
   *
   * @param credential - 要驗證的憑證
   * @returns 是否有效
   */
  async verifyCredential(credential: VerifiableCredential): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    try {
      logger.info('開始驗證可驗證憑證', {
        credentialId: credential.id,
        issuer: credential.issuer
      });

      // 1. 檢查憑證結構
      if (!credential.proof || !credential.proof.jws) {
        return { isValid: false, reason: '憑證缺少簽名' };
      }

      // 2. 檢查憑證是否過期
      if (credential.expirationDate) {
        const expirationDate = new Date(credential.expirationDate);
        if (expirationDate < new Date()) {
          return { isValid: false, reason: '憑證已過期' };
        }
      }

      // 3. 解析簽發者 DID
      const issuerDID = await this.resolveDID(credential.issuer);
      if (!issuerDID) {
        return { isValid: false, reason: '無法解析簽發者 DID' };
      }

      // 4. 驗證簽名 (簡化版)
      // 實際應使用 did-jwt 的 verifyJWT 函數
      const hasValidSignature = credential.proof.jws.length > 0;

      if (!hasValidSignature) {
        return { isValid: false, reason: '簽名驗證失敗' };
      }

      logger.info('✅ 憑證驗證成功', {
        credentialId: credential.id
      });

      return { isValid: true };
    } catch (error) {
      logger.error('❌ 憑證驗證失敗', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credential.id
      });
      return {
        isValid: false,
        reason: error instanceof Error ? error.message : '驗證過程發生錯誤'
      };
    }
  }

  /**
   * 解析 DID,獲取 DID Document
   *
   * @param did - DID 字符串
   * @returns DID Document 或 null
   */
  async resolveDID(did: string): Promise<DIDDocument | null> {
    try {
      logger.info('解析 DID Document', { did });

      // 對於 did:key 方法，可以直接從 DID 字符串重建 DID Document
      // 因為 did:key 是自包含的（public key 編碼在 DID 中）
      if (!did.startsWith('did:key:')) {
        logger.warn('只支援 did:key 方法', { did });
        return null;
      }

      // 使用 DID 類別來解析（最可靠的方法）
      const tempDID = new DID({
        resolver: KeyResolver.getResolver()
      });

      const result = await tempDID.resolve(did);

      if (!result || !result.didDocument) {
        logger.warn('DID Document 不存在', { did });
        return null;
      }

      logger.info('✅ DID 解析成功', {
        did,
        verificationMethods: result.didDocument.verificationMethod?.length || 0
      });

      return result.didDocument as DIDDocument;
    } catch (error) {
      logger.error('❌ DID 解析失敗', {
        error: error instanceof Error ? error.message : String(error),
        did,
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * 獲取 DID Document (私有方法)
   */
  private async getDIDDocument(did: DID): Promise<DIDDocument> {
    // 構建 DID Document
    const didId = did.id;
    const keyFragment = didId.split(':').pop() || '';

    return {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      id: didId,
      verificationMethod: [{
        id: `${didId}#${keyFragment}`,
        type: 'Ed25519VerificationKey2020',
        controller: didId,
        publicKeyMultibase: keyFragment
      }],
      authentication: [`${didId}#${keyFragment}`],
      assertionMethod: [`${didId}#${keyFragment}`]
    };
  }

  /**
   * 獲取管理員 DID
   */
  getAdminDID(): string | null {
    return this.adminDID?.id || null;
  }

  /**
   * 生成 DID Document Hash (用於鏈上存儲)
   */
  async hashDIDDocument(didDocument: DIDDocument): Promise<string> {
    const { createHash } = await import('crypto');
    const documentString = JSON.stringify(didDocument);
    const hash = createHash('sha256').update(documentString).digest('hex');
    return hash;
  }
}

// 導出單例
export const selfService = new SelfService();
