/**
 * Self Protocol 驗證服務
 * 用於驗證 Self Protocol 提供的零知識證明 (Zero-Knowledge Proofs)
 *
 * 功能:
 * - 驗證護照 NFC 掃描證明
 * - 年齡驗證 (18+)
 * - 國籍驗證
 * - OFAC 制裁名單檢查
 * - 選擇性數據披露
 */

import { SelfBackendVerifier, DefaultConfigStore } from '@selfxyz/core';
import { logger } from '@/utils/logger.js';

// ===== 類型定義 =====

/**
 * Self Protocol 驗證參數
 */
export interface SelfVerificationParams {
  attestationId: string;
  proof: any;
  publicSignals: any;
  userContextData?: any;
}

/**
 * Self Protocol 驗證結果
 */
export interface SelfVerificationResult {
  isValid: boolean;
  userIdentifier?: string;
  disclosedData?: {
    fullName?: string;
    name?: string;
    documentNumber?: string;
    passportNumber?: string;
    nationality?: string;
    country?: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
  };
  checks: {
    ageVerified: boolean;
    ofacClear: boolean;
    nationalityAllowed: boolean;
  };
  errorMessage?: string;
}

/**
 * Self Protocol 服務配置
 */
interface SelfProtocolConfig {
  scope: string;
  endpoint: string;
  mockPassport: boolean;
  allowedIds: (1 | 2 )[]; // 只允許 1 (passport_nfc) 或 2 (其他)
  minAge: number;
  excludedCountries: string[]; // 會轉換為 ISO 3166-1 alpha-3 代碼
  checkOFAC: boolean;
}

/**
 * Self Protocol 服務類
 */
class SelfProtocolService {
  private verifier: SelfBackendVerifier | null = null;
  private config: SelfProtocolConfig;
  private isInitialized = false;

  constructor() {
    // 從環境變數讀取配置
    this.config = {
      scope: process.env.SELF_PROTOCOL_SCOPE || 'taxcoin-kyc',
      endpoint: `${process.env.PUBLIC_URL || 'http://localhost:5003'}/api/v1/kyc/self-verify`,
      mockPassport: true, // 使用 mock passport 進行測試 (Celo Testnet)
      allowedIds: [1, 2], // 1 = passport_nfc, 2 = 其他證明
      minAge: 18,
      excludedCountries: ['IRN', 'PRK', 'SYR', 'CUB'], // ISO 3166-1 alpha-3: Iran, North Korea, Syria, Cuba
      checkOFAC: true
    };
  }

  /**
   * 初始化 Self Protocol Verifier
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.verifier) {
      return;
    }

    try {
      logger.info('🔧 初始化 Self Protocol Verifier', {
        scope: this.config.scope,
        endpoint: this.config.endpoint,
        mockPassport: this.config.mockPassport,
        environment: process.env.NODE_ENV
      });

      // 創建 allowedIds Map<1 | 2 | 3, boolean>
      const allowedIdsMap = new Map<1 | 2, boolean>();
      this.config.allowedIds.forEach(id => allowedIdsMap.set(id, true));

      // 創建 DefaultConfigStore 並傳入配置
      const configStore = new DefaultConfigStore({
        minimumAge: this.config.minAge,
        excludedCountries: this.config.excludedCountries as any, // 類型轉換為 SDK 要求的聯合類型
        ofac: this.config.checkOFAC
      });

      // SelfBackendVerifier 構造函數接受 6 個參數
      this.verifier = new SelfBackendVerifier(
        this.config.scope,          // scope
        this.config.endpoint,        // endpoint
        this.config.mockPassport,    // mockPassport
        allowedIdsMap,               // allowedIds (Map)
        configStore,                 // configStorage
        'uuid'                       // userIdentifierType
      );

      this.isInitialized = true;

      logger.info('✅ Self Protocol Verifier 初始化成功', {
        scope: this.config.scope,
        minAge: this.config.minAge,
        excludedCountries: this.config.excludedCountries
      });
    } catch (error) {
      logger.error('❌ Self Protocol Verifier 初始化失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(
        `Self Protocol 初始化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 驗證 Self Protocol 提供的零知識證明
   *
   * @param params - 驗證參數
   * @returns 驗證結果
   */
  async verifySelfProof(params: SelfVerificationParams): Promise<SelfVerificationResult> {
    // 確保 verifier 已初始化
    if (!this.isInitialized || !this.verifier) {
      await this.initialize();
    }

    if (!this.verifier) {
      throw new Error('Self Protocol Verifier 未初始化');
    }

    try {
      logger.info('🔍 開始驗證 Self Protocol 零知識證明', {
        attestationId: params.attestationId,
        hasProof: !!params.proof,
        hasPublicSignals: !!params.publicSignals
      });

      // 呼叫 Self SDK 的驗證方法
      // verify(attestationId: 1 | 2, proof, publicSignals, userData)
      // 將 attestationId 轉換為數字類型 (1 或 2)
      let attestationIdNum: 1 | 2 = 1; // 默認為 1 (passport_nfc)
      if (typeof params.attestationId === 'string') {
        // 字符串轉換: 'passport_nfc' or '1' => 1, 其他 => 2
        attestationIdNum = (params.attestationId === 'passport_nfc' || params.attestationId === '1') ? 1 : 2;
      } else if (params.attestationId === 2) {
        attestationIdNum = 2;
      }

      const result = await this.verifier.verify(
        attestationIdNum,
        params.proof,
        params.publicSignals,
        params.userContextData || {}
      );

      logger.info('Self Protocol 原始驗證結果', { result });

      // 解析驗證結果（根據實際 API 返回的結構）
      const isValid = result.isValidDetails?.isValid === true;

      // 提取披露的數據
      const discloseOutput = result.discloseOutput as any || {};
      const disclosedData: any = {
        fullName: discloseOutput.fullName || discloseOutput.name,
        documentNumber: discloseOutput.documentNumber,
        passportNumber: discloseOutput.passportNumber,
        nationality: discloseOutput.nationality || discloseOutput.country,
        dateOfBirth: discloseOutput.dateOfBirth,
        age: discloseOutput.age,
        gender: discloseOutput.gender
      };

      // 驗證檢查項（根據實際 API 結構）
      const checks = {
        ageVerified: result.isValidDetails?.isMinimumAgeValid || false,
        ofacClear: result.isValidDetails?.isOfacValid !== false,
        nationalityAllowed: !result.forbiddenCountriesList || result.forbiddenCountriesList.length === 0
      };

      if (!isValid) {
        logger.warn('❌ Self Protocol 驗證失敗', {
          attestationId: params.attestationId,
          isValidDetails: result.isValidDetails
        });

        return {
          isValid: false,
          checks,
          errorMessage: '驗證失敗'
        };
      }

      logger.info('✅ Self Protocol 驗證成功', {
        attestationId: params.attestationId,
        disclosedData,
        checks
      });

      return {
        isValid: true,
        userIdentifier: params.userContextData?.userIdentifier,
        disclosedData,
        checks
      };
    } catch (error) {
      logger.error('❌ Self Protocol 驗證過程發生錯誤', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attestationId: params.attestationId
      });

      return {
        isValid: false,
        checks: {
          ageVerified: false,
          ofacClear: false,
          nationalityAllowed: false
        },
        errorMessage: error instanceof Error ? error.message : '驗證過程發生錯誤'
      };
    }
  }

  /**
   * 獲取配置信息
   */
  getConfig(): SelfProtocolConfig {
    return { ...this.config };
  }

  /**
   * 檢查是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.verifier !== null;
  }
}

// 導出單例
export const selfProtocolService = new SelfProtocolService();
