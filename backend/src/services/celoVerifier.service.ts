/**
 * Celo 鏈上 Self Protocol 驗證服務
 *
 * 功能：
 * - 在 Celo Alfajores Testnet 上驗證 Self Protocol proof
 * - 查詢鏈上驗證狀態
 * - 管理驗證記錄
 */

import { ethers } from 'ethers';
import { logger } from '@/utils/logger.js';

// Verifier 合約 ABI
const VERIFIER_ABI = [
  "function verifyProof(bytes calldata proof, bytes calldata publicSignals, string calldata nationality, uint256 age, bool ofacClear) external returns (bool)",
  "function getVerification(address user) external view returns (tuple(bytes32 proofHash, string nationality, uint256 age, bool ofacClear, uint256 timestamp, bool isValid))",
  "function isVerified(address user) external view returns (bool)",
  "function isProofUsed(bytes32 proofHash) external view returns (bool)",
  "event ProofVerified(address indexed user, bytes32 indexed proofHash, string nationality, uint256 age, bool ofacClear, uint256 timestamp)",
  "event VerificationFailed(address indexed user, string reason)"
];

/**
 * Celo 驗證參數
 */
export interface CeloVerificationParams {
  proof: string;           // Hex encoded proof (0x...)
  publicSignals: string;   // Hex encoded public signals (0x...)
  nationality: string;     // ISO 3166-1 alpha-3 (例如: "USA", "TWN")
  age: number;             // 年齡
  ofacClear: boolean;      // OFAC 檢查結果
  userAddress: string;     // 用戶的 Celo 錢包地址
}

/**
 * Celo 驗證結果
 */
export interface CeloVerificationResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}

/**
 * 鏈上驗證記錄
 */
export interface OnChainVerification {
  isVerified: boolean;
  nationality: string;
  age: number;
  ofacClear: boolean;
  timestamp: Date;
  proofHash: string;
}

/**
 * Celo Verifier Service 類
 */
class CeloVerifierService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private verifierContract: ethers.Contract | null = null;
  private isInitialized = false;

  /**
   * 初始化 Celo 連接
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.verifierContract) {
      return;
    }

    try {
      // 檢查環境變數
      const rpcUrl = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
      const privateKey = process.env.CELO_PRIVATE_KEY;
      const contractAddress = process.env.CELO_VERIFIER_CONTRACT;

      if (!privateKey) {
        logger.warn('⚠️  CELO_PRIVATE_KEY 未配置，Celo 鏈上驗證功能將被禁用');
        return;
      }

      if (!contractAddress) {
        logger.warn('⚠️  CELO_VERIFIER_CONTRACT 未配置，Celo 鏈上驗證功能將被禁用');
        return;
      }

      // 初始化 Provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // 初始化 Signer
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // 初始化合約
      this.verifierContract = new ethers.Contract(
        contractAddress,
        VERIFIER_ABI,
        this.signer
      );

      // 測試連接
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.signer.address);

      this.isInitialized = true;

      logger.info('✅ Celo Verifier Service 初始化成功', {
        network: network.name,
        chainId: network.chainId.toString(),
        rpcUrl,
        signerAddress: this.signer.address,
        balance: ethers.formatEther(balance) + ' CELO',
        contractAddress
      });

      // 警告：餘額不足
      if (balance === 0n) {
        logger.warn('⚠️  Celo 錢包餘額為 0，請到 Faucet 領取測試 CELO:', {
          faucet: 'https://faucet.celo.org/alfajores',
          address: this.signer.address
        });
      }
    } catch (error) {
      logger.error('❌ Celo Verifier Service 初始化失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(
        `Celo Verifier 初始化失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 檢查服務是否可用
   */
  isAvailable(): boolean {
    return this.isInitialized && this.verifierContract !== null;
  }

  /**
   * 在 Celo 鏈上驗證 Self Protocol Proof
   */
  async verifyOnChain(params: CeloVerificationParams): Promise<CeloVerificationResult> {
    // 確保已初始化
    if (!this.isInitialized || !this.verifierContract) {
      await this.initialize();
    }

    if (!this.verifierContract) {
      return {
        success: false,
        error: 'Celo Verifier 服務未初始化'
      };
    }

    try {
      logger.info('🔗 開始 Celo 鏈上驗證', {
        userAddress: params.userAddress,
        nationality: params.nationality,
        age: params.age,
        ofacClear: params.ofacClear
      });

      // 驗證參數
      if (!params.proof.startsWith('0x')) {
        params.proof = '0x' + params.proof;
      }
      if (!params.publicSignals.startsWith('0x')) {
        params.publicSignals = '0x' + params.publicSignals;
      }

      // 將 proof 和 publicSignals 轉為 bytes
      const proofBytes = ethers.getBytes(params.proof);
      const publicSignalsBytes = ethers.getBytes(params.publicSignals);

      // 呼叫智能合約驗證
      logger.info('📝 正在發送交易到 Celo 鏈上...');

      if (!this.verifierContract) {
        throw new Error('Verifier contract not initialized');
      }

      const contract: any = this.verifierContract;
      const tx = await contract.verifyProof(
        proofBytes,
        publicSignalsBytes,
        params.nationality,
        params.age,
        params.ofacClear,
        {
          gasLimit: 500000 // 設定 gas limit
        }
      );

      logger.info('⏳ 交易已提交，等待確認...', {
        txHash: tx.hash,
        from: tx.from,
        to: tx.to
      });

      // 等待交易確認
      const receipt = await tx.wait();

      logger.info('✅ Celo 鏈上驗證成功', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'Success' : 'Failed'
      });

      return {
        success: receipt.status === 1,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error: any) {
      logger.error('❌ Celo 鏈上驗證失敗', {
        error: error.message || String(error),
        code: error.code,
        userAddress: params.userAddress
      });

      // 解析錯誤訊息
      let errorMessage = 'Unknown error';
      if (error.message) {
        if (error.message.includes('Proof already used')) {
          errorMessage = 'Proof 已被使用（重放攻擊防護）';
        } else if (error.message.includes('Age below minimum')) {
          errorMessage = '年齡低於最低要求';
        } else if (error.message.includes('Nationality not allowed')) {
          errorMessage = '國籍不被允許';
        } else if (error.message.includes('OFAC check failed')) {
          errorMessage = 'OFAC 檢查失敗';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Gas 費用不足，請充值 Celo';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 查詢用戶鏈上驗證狀態
   */
  async getVerificationStatus(userAddress: string): Promise<OnChainVerification | null> {
    if (!this.isInitialized || !this.verifierContract) {
      await this.initialize();
    }

    if (!this.verifierContract) {
      logger.warn('Celo Verifier 服務未初始化');
      return null;
    }

    try {
      logger.info('🔍 查詢鏈上驗證狀態', { userAddress });

      const contract: any = this.verifierContract;
      const verification = await contract.getVerification(userAddress);
      const isVerified = await contract.isVerified(userAddress);

      if (!isVerified) {
        logger.info('用戶尚未完成鏈上驗證', { userAddress });
        return null;
      }

      const result: OnChainVerification = {
        isVerified,
        nationality: verification.nationality,
        age: Number(verification.age),
        ofacClear: verification.ofacClear,
        timestamp: new Date(Number(verification.timestamp) * 1000),
        proofHash: verification.proofHash
      };

      logger.info('✅ 查詢鏈上驗證狀態成功', {
        userAddress,
        result
      });

      return result;
    } catch (error) {
      logger.error('❌ 查詢鏈上驗證狀態失敗', {
        error: error instanceof Error ? error.message : String(error),
        userAddress
      });
      return null;
    }
  }

  /**
   * 檢查 Proof 是否已使用
   */
  async isProofUsed(proof: string, publicSignals: string, userAddress: string): Promise<boolean> {
    if (!this.isInitialized || !this.verifierContract) {
      await this.initialize();
    }

    if (!this.verifierContract) {
      return false;
    }

    try {
      if (!this.verifierContract) {
        throw new Error('Verifier contract not initialized');
      }

      const contract: any = this.verifierContract;

      // 計算 proof hash
      const proofHash = ethers.keccak256(
        ethers.solidityPacked(
          ['bytes', 'bytes', 'address'],
          [proof, publicSignals, userAddress]
        )
      );

      const isUsed = await contract.isProofUsed(proofHash);
      return isUsed;
    } catch (error) {
      logger.error('❌ 檢查 Proof 使用狀態失敗', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 獲取合約地址
   */
  getContractAddress(): string | null {
    return this.verifierContract?.target as string || null;
  }

  /**
   * 獲取 Signer 地址
   */
  getSignerAddress(): string | null {
    return this.signer?.address || null;
  }
}

// 導出單例
export const celoVerifierService = new CeloVerifierService();
