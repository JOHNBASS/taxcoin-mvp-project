/**
 * Sui 區塊鏈服務
 *
 * 功能：
 * - 連接 Sui 網路
 * - Mint TaxCoin 代幣
 * - 鑄造 NFT 憑證
 * - 查詢鏈上資料
 */

import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromB64 } from '@mysten/sui.js/utils';
import { bech32 } from 'bech32';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';

// ===== 類型定義 =====

export interface MintTaxCoinParams {
  recipientAddress: string;
  amount: number; // TaxCoin 數量（會自動轉換為最小單位）
  claimId: string;
}

export interface MintNFTParams {
  recipientAddress: string;
  claimId: string;
  did: string; // W3C DID
  didDocumentHash?: string; // ✅ DID Document Hash
  credentialId?: string; // ✅ 可驗證憑證 ID
  originalAmount: number; // 原始金額（TWD 分）
  taxAmount: number; // 退稅金額（TWD 分）
  merchantName: string;
  purchaseDate: number; // Unix timestamp (ms)
  receiptHash: string; // 收據圖片 hash
}

export interface DisburseTokensParams {
  claimId: string;
  recipientAddress: string;
  did: string;
  didDocumentHash?: string; // ✅ DID Document Hash
  credentialId?: string; // ✅ 可驗證憑證 ID
  originalAmount: number;
  taxAmount: number;
  taxCoinAmount: number;
  merchantName: string;
  purchaseDate: string;
  receiptHash: string;
}

export interface DisburseResult {
  success: boolean;
  txHash: string;
  nftObjectId: string;
  taxCoinAmount: number;
}

// ===== Sui 服務類 =====

class SuiService {
  private client: SuiClient;
  private keypair: Ed25519Keypair | null = null;
  private adminAddress: string | null = null;

  constructor() {
    // 初始化 Sui 客戶端
    const network = config.sui.network;
    const rpcUrl = getFullnodeUrl(network);
    this.client = new SuiClient({ url: rpcUrl });

    logger.info('Sui 服務初始化', { network, rpcUrl });

    // 初始化管理員密鑰對
    this.initializeKeypair();
  }

  /**
   * 初始化管理員密鑰對
   */
  private initializeKeypair() {
    try {
      logger.info('開始初始化密鑰對', {
        hasConfig: !!config.sui,
        configKeys: Object.keys(config.sui || {})
      });

      const privateKey = config.sui.privateKey;

      console.log('[DEBUG] Private Key Info:');
      console.log('  - Has private key:', !!privateKey);
      console.log('  - Type:', typeof privateKey);
      console.log('  - Length:', privateKey?.length);
      console.log('  - First 30 chars:', privateKey?.substring(0, 30));
      console.log('  - Starts with suiprivkey:', privateKey?.startsWith('suiprivkey'));

      logger.info('讀取私鑰配置', {
        hasPrivateKey: !!privateKey,
        privateKeyType: typeof privateKey
      });

      if (!privateKey) {
        logger.warn('未配置 Sui 私鑰，區塊鏈功能將不可用');
        return;
      }

      logger.info('嘗試初始化 Sui 密鑰對', {
        privateKeyLength: privateKey.length,
        privateKeyPrefix: privateKey.substring(0, 15) + '...',
        startsWithSuiprivkey: privateKey.startsWith('suiprivkey'),
        firstChars: privateKey.substring(0, 20)
      });

      // 支持多種私鑰格式
      if (privateKey.startsWith('suiprivkey')) {
        // Bech32 格式的私鑰 (從錢包導出的格式)
        logger.info('解析 Bech32 格式私鑰');

        // 解碼 Bech32 格式
        const decoded = bech32.decode(privateKey);
        const words = decoded.words;

        // 將 5-bit words 轉換為 8-bit bytes
        const bytes = bech32.fromWords(words);

        // 轉換為 Uint8Array (移除第一個 byte 的 flag)
        const secretKey = new Uint8Array(bytes.slice(1));

        logger.info('Bech32 解碼成功', {
          prefix: decoded.prefix,
          secretKeyLength: secretKey.length
        });

        this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
        logger.info('使用 Bech32 格式私鑰初始化成功');
      } else {
        // Base64 格式的私鑰
        const raw = fromB64(privateKey);
        // 檢查 flag byte (應該是 0x00 for Ed25519)
        if (raw[0] !== 0) {
          throw new Error('無效的私鑰格式: flag byte 不正確');
        }
        const secretKey = raw.slice(1);
        this.keypair = Ed25519Keypair.fromSecretKey(secretKey);
        logger.info('使用 Base64 格式私鑰', { secretKeyLength: secretKey.length });
      }

      this.adminAddress = this.keypair.getPublicKey().toSuiAddress();

      logger.info('Sui 密鑰對初始化成功', { adminAddress: this.adminAddress });
    } catch (error) {
      logger.error('Sui 密鑰對初始化失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        'Sui 服務初始化失敗'
      );
    }
  }

  /**
   * 檢查服務是否已初始化
   */
  private checkInitialized() {
    if (!this.keypair || !this.adminAddress) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        'Sui 服務未正確初始化，請檢查私鑰配置'
      );
    }
  }

  /**
   * 檢查必要的配置
   */
  private checkConfig() {
    if (!config.sui.taxCoinPackageId) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '未配置 TaxCoin Package ID'
      );
    }
  }

  /**
   * Mint TaxCoin 代幣
   * 新汇率: 0.0001 TAXCOIN = 1 TWD (即 10,000 TAXCOIN = 1 TWD)
   */
  async mintTaxCoin(params: MintTaxCoinParams): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    const { recipientAddress, amount, claimId } = params;

    logger.info('開始 Mint TaxCoin', { recipientAddress, amount, claimId });

    try {
      const tx = new TransactionBlock();

      // TaxCoin 使用 8 位小數精度，1 TWD = 1 TAXCOIN
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));

      // 調用智能合約的 mint 函數
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::taxcoin::mint`,
        arguments: [
          tx.object(this.getTreasuryCap()), // TreasuryCap
          tx.object(this.getAdminCap()), // AdminCap
          tx.pure(amountInSmallestUnit), // amount
          tx.pure(recipientAddress), // recipient
          tx.pure(Array.from(new TextEncoder().encode(claimId))), // claim_id
        ],
      });

      // 簽名並執行交易
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('TaxCoin Mint 成功', {
        txHash: result.digest,
        claimId,
        amount,
      });

      return result.digest;
    } catch (error) {
      logger.error('TaxCoin Mint 失敗', { error, params });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `TaxCoin 發放失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 鑄造 NFT 憑證
   */
  async mintNFT(params: MintNFTParams): Promise<{ txHash: string; nftObjectId: string }> {
    this.checkInitialized();
    this.checkConfig();

    const {
      recipientAddress,
      claimId,
      did,
      didDocumentHash,
      credentialId,
      originalAmount,
      taxAmount,
      merchantName,
      purchaseDate,
      receiptHash,
    } = params;

    logger.info('開始鑄造 NFT', {
      recipientAddress,
      claimId,
      hasDIDDocumentHash: !!didDocumentHash,
      hasCredentialId: !!credentialId
    });

    try {
      const tx = new TransactionBlock();

      // 調用智能合約的 mint 函數
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::tax_claim_nft::mint`,
        arguments: [
          tx.object(this.getNFTAdminCap()), // AdminCap
          tx.pure(Array.from(new TextEncoder().encode(claimId))), // claim_id
          tx.pure(Array.from(new TextEncoder().encode(did))), // did
          tx.pure(originalAmount), // original_amount (分)
          tx.pure(taxAmount), // tax_amount (分)
          tx.pure(Array.from(new TextEncoder().encode(merchantName))), // merchant_name
          tx.pure(purchaseDate), // purchase_date (timestamp)
          tx.pure(Array.from(new TextEncoder().encode(receiptHash))), // receipt_hash
          tx.pure(recipientAddress), // recipient
          tx.pure(3, 'u8'), // ✅ initial_status = 3 (STATUS_DISBURSED 已發放)
        ],
      });

      // 簽名並執行交易
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      // 從 objectChanges 中找到新創建的 NFT object ID
      const createdObjects = result.objectChanges?.filter(
        (change) => change.type === 'created'
      );

      const nftObject = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('TaxClaimNFT')
      );

      const nftObjectId = (nftObject as any)?.objectId || '';

      logger.info('NFT 鑄造成功', {
        txHash: result.digest,
        nftObjectId,
        claimId,
      });

      return {
        txHash: result.digest,
        nftObjectId,
      };
    } catch (error) {
      logger.error('NFT 鑄造失敗', { error, params });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `NFT 鑄造失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 完整發放流程：在單一交易中同時 mint TaxCoin 和 NFT
   * ✅ 避免版本衝突（gas object version mismatch）
   */
  async disburseTokens(params: DisburseTokensParams): Promise<DisburseResult> {
    this.checkInitialized();
    this.checkConfig();

    const {
      claimId,
      recipientAddress,
      did,
      didDocumentHash,
      credentialId,
      originalAmount,
      taxAmount,
      taxCoinAmount,
      merchantName,
      purchaseDate,
      receiptHash,
    } = params;

    logger.info('開始發放 Token 和 NFT（單一交易）', {
      claimId,
      recipientAddress,
      hasDIDDocumentHash: !!didDocumentHash,
      hasCredentialId: !!credentialId,
      taxCoinAmount,
    });

    try {
      const tx = new TransactionBlock();

      // 1. TaxCoin Mint
      const amountInSmallestUnit = Math.floor(taxCoinAmount * Math.pow(10, 8));
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::taxcoin::mint`,
        arguments: [
          tx.object(this.getTreasuryCap()),
          tx.object(this.getAdminCap()),
          tx.pure(amountInSmallestUnit),
          tx.pure(recipientAddress),
          tx.pure(Array.from(new TextEncoder().encode(claimId))),
        ],
      });

      // 2. NFT Mint
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::tax_claim_nft::mint`,
        arguments: [
          tx.object(this.getNFTAdminCap()),
          tx.pure(Array.from(new TextEncoder().encode(claimId))),
          tx.pure(Array.from(new TextEncoder().encode(did))),
          tx.pure(Math.floor(originalAmount * 100)), // 原始金額（分）
          tx.pure(Math.floor(taxAmount * 100)), // 退稅金額（分）
          tx.pure(Array.from(new TextEncoder().encode(merchantName))),
          tx.pure(new Date(purchaseDate).getTime()),
          tx.pure(Array.from(new TextEncoder().encode(receiptHash))),
          tx.pure(recipientAddress),
          tx.pure(3, 'u8'), // initial_status = 3 (STATUS_DISBURSED)
        ],
      });

      // 3. 簽名並執行交易
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      // 從 objectChanges 中找到新創建的 NFT object ID
      const createdObjects = result.objectChanges?.filter(
        (change) => change.type === 'created'
      );

      const nftObject = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('TaxClaimNFT')
      );

      const nftObjectId = (nftObject as any)?.objectId || '';

      logger.info('✅ Token 和 NFT 發放成功（單一交易）', {
        claimId,
        txHash: result.digest,
        nftObjectId,
        taxCoinAmount,
      });

      return {
        success: true,
        txHash: result.digest,
        nftObjectId,
        taxCoinAmount,
      };
    } catch (error) {
      logger.error('❌ Token 發放失敗', { error, claimId });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `Token 發放失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 查詢交易狀態（帶重試機制）
   */
  async getTransaction(txHash: string, maxRetries = 5, delayMs = 2000) {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔍 查詢交易 (嘗試 ${attempt}/${maxRetries})`, { txHash });

        const tx = await this.client.getTransactionBlock({
          digest: txHash,
          options: {
            showEffects: true,
            showEvents: true,
            showInput: true,
          },
        });

        logger.info('✅ 交易查詢成功', {
          txHash,
          attempt,
          status: tx.effects?.status?.status,
        });

        return tx;
      } catch (error) {
        lastError = error;
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.warn(`⚠️ 交易查詢失敗 (嘗試 ${attempt}/${maxRetries})`, {
          error: errorMsg,
          txHash,
        });

        // 如果還有重試次數，等待後重試
        if (attempt < maxRetries) {
          logger.info(`⏳ 等待 ${delayMs}ms 後重試...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // 所有重試都失敗了
    logger.error('❌ 交易查詢失敗（所有重試都失敗）', {
      error: lastError,
      txHash,
      maxRetries,
    });

    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `查詢交易失敗（已重試 ${maxRetries} 次）`
    );
  }

  /**
   * 查詢 NFT 詳情
   */
  async getNFT(objectId: string) {
    try {
      const obj = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      return obj;
    } catch (error) {
      logger.error('查詢 NFT 失敗', { error, objectId });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        '查詢 NFT 失敗'
      );
    }
  }

  /**
   * 獲取 TreasuryCap Object ID
   */
  private getTreasuryCap(): string {
    const treasuryCap = process.env.SUI_TAXCOIN_TREASURY_CAP;
    if (!treasuryCap) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '未配置 TreasuryCap Object ID (SUI_TAXCOIN_TREASURY_CAP)'
      );
    }
    return treasuryCap;
  }

  /**
   * 獲取 TaxCoin AdminCap Object ID
   */
  private getAdminCap(): string {
    const adminCap = process.env.SUI_TAXCOIN_ADMIN_CAP;
    if (!adminCap) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '未配置 TaxCoin AdminCap Object ID (SUI_TAXCOIN_ADMIN_CAP)'
      );
    }
    return adminCap;
  }

  /**
   * 獲取 NFT AdminCap Object ID (Tax Claim NFT)
   */
  private getNFTAdminCap(): string {
    const nftAdminCap = config.sui.nftAdminCapId;
    if (!nftAdminCap) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '未配置 Tax Claim NFT AdminCap Object ID (SUI_NFT_ADMIN_CAP)'
      );
    }
    return nftAdminCap;
  }

  /**
   * 獲取管理員地址
   */
  getAdminAddress(): string | null {
    return this.adminAddress;
  }

  /**
   * 查詢用戶的 TaxCoin 餘額
   */
  async getTaxCoinBalance(walletAddress: string): Promise<number> {
    try {
      if (!config.sui.taxCoinPackageId) {
        throw new BusinessError(
          ErrorCode.INTERNAL_ERROR,
          '未配置 TaxCoin Package ID'
        );
      }

      // 查詢用戶持有的所有 TaxCoin 對象
      const coins = await this.client.getCoins({
        owner: walletAddress,
        coinType: `${config.sui.taxCoinPackageId}::taxcoin::TAXCOIN`,
      });

      // 計算總餘額
      const totalBalance = coins.data.reduce(
        (sum, coin) => sum + BigInt(coin.balance),
        BigInt(0)
      );

      // TaxCoin 使用 8 位小數精度，轉換為 TWD（分）
      const balanceInCents = Number(totalBalance) / Math.pow(10, 8);

      logger.info('查詢 TaxCoin 餘額成功', {
        walletAddress,
        balance: balanceInCents,
        coinCount: coins.data.length,
      });

      return balanceInCents;
    } catch (error) {
      logger.error('查詢 TaxCoin 餘額失敗', { error, walletAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `查詢 TaxCoin 餘額失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 查詢用戶的 SUI 餘額
   */
  async getSuiBalance(walletAddress: string): Promise<number> {
    try {
      // 查詢 SUI 餘額
      const balance = await this.client.getBalance({
        owner: walletAddress,
        coinType: '0x2::sui::SUI',
      });

      // SUI 使用 9 位小數精度
      const balanceInSui = Number(balance.totalBalance) / Math.pow(10, 9);

      logger.info('查詢 SUI 餘額成功', {
        walletAddress,
        balance: balanceInSui,
      });

      return balanceInSui;
    } catch (error) {
      logger.error('查詢 SUI 餘額失敗', { error, walletAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `查詢 SUI 餘額失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 管理員鑄造 TaxCoin（不需要 claimId）
   * 用於管理員直接為用戶增加 TaxCoin 餘額
   */
  async adminMintTaxCoin(params: {
    recipientAddress: string;
    amount: number; // TaxCoin 數量（TWD）
  }): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    const { recipientAddress, amount } = params;

    logger.info('管理員開始 Mint TaxCoin', { recipientAddress, amount });

    try {
      const tx = new TransactionBlock();

      // TaxCoin 使用 8 位小數精度，1 TWD = 1 TAXCOIN
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));

      // 調用智能合約的 mint 函數
      // 使用特殊的 claim_id 標記為管理員鑄造
      const adminClaimId = `ADMIN_MINT_${Date.now()}`;

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::taxcoin::mint`,
        arguments: [
          tx.object(this.getTreasuryCap()), // TreasuryCap
          tx.object(this.getAdminCap()), // AdminCap
          tx.pure(amountInSmallestUnit, 'u64'), // amount
          tx.pure(recipientAddress, 'address'), // recipient
          tx.pure(Array.from(new TextEncoder().encode(adminClaimId)), 'vector<u8>'), // claim_id
        ],
      });

      // 簽名並執行交易
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      const txHash = result.digest;

      logger.info('管理員 Mint TaxCoin 成功', {
        txHash,
        recipientAddress,
        amount,
        amountInSmallestUnit,
      });

      return txHash;
    } catch (error) {
      logger.error('管理員 Mint TaxCoin 失敗', { error, recipientAddress, amount });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `管理員鑄造 TaxCoin 失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 投資到 RWA Pool
   * 調用智能合約的 invest 函數，將 TaxCoin 轉入池中並獲得 PoolShare NFT
   */
  async investToPool(params: {
    poolAddress: string;
    investorAddress: string;
    amount: number; // 投資金額（TWD 分）
  }): Promise<{
    txHash: string;
    poolShareNftId: string;
    amount: number;
  }> {
    this.checkInitialized();
    this.checkConfig();

    const { poolAddress, investorAddress, amount } = params;

    logger.info('開始投資到 RWA Pool', { poolAddress, investorAddress, amount });

    try {
      // 1. 查詢用戶餘額
      const balance = await this.getTaxCoinBalance(investorAddress);
      if (balance < amount) {
        throw new BusinessError(
          ErrorCode.INSUFFICIENT_BALANCE,
          `TaxCoin 餘額不足: 需要 ${amount} 分，當前餘額 ${balance} 分`
        );
      }

      // 2. 獲取用戶的 TaxCoin 對象
      const coins = await this.client.getCoins({
        owner: investorAddress,
        coinType: `${config.sui.taxCoinPackageId}::taxcoin::TAXCOIN`,
      });

      if (coins.data.length === 0) {
        throw new BusinessError(
          ErrorCode.INSUFFICIENT_BALANCE,
          '未找到 TaxCoin'
        );
      }

      // 3. 獲取第一個 TaxCoin 對象
      const firstCoin = coins.data[0];
      if (!firstCoin) {
        throw new BusinessError(
          ErrorCode.INSUFFICIENT_BALANCE,
          '未找到可用的 TaxCoin'
        );
      }

      // 4. 創建交易
      const tx = new TransactionBlock();

      // TaxCoin 使用 8 位小數精度
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));

      // 合併並分割正確數量的 TaxCoin
      const coinResult = tx.splitCoins(tx.object(firstCoin.coinObjectId), [
        tx.pure(amountInSmallestUnit),
      ]);

      // 取得分割後的硬幣
      const coin = coinResult[0];

      if (!coin) {
        throw new BusinessError(
          ErrorCode.INTERNAL_ERROR,
          '分割 TaxCoin 失敗'
        );
      }

      // 調用 rwa_pool::invest
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::invest`,
        arguments: [
          tx.object(poolAddress), // RWAPool 對象
          coin as any, // 支付的 TaxCoin
        ],
      });

      // 注意：這個交易需要由投資者簽名，而不是管理員
      // 因此我們只能構建交易，不能在這裡簽名執行
      // 需要返回交易數據給前端，讓用戶簽名

      logger.warn('投資交易需要由用戶簽名，當前實現為管理員代簽（僅供測試）');

      // 臨時方案：管理員代簽（生產環境中應該由前端用戶簽名）
      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      // 從 objectChanges 中找到新創建的 PoolShare NFT
      const createdObjects = result.objectChanges?.filter(
        (change) => change.type === 'created'
      );

      const poolShareNft = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('PoolShare')
      );

      const poolShareNftId = (poolShareNft as any)?.objectId || '';

      logger.info('投資成功', {
        txHash: result.digest,
        poolShareNftId,
        amount,
      });

      return {
        txHash: result.digest,
        poolShareNftId,
        amount,
      };
    } catch (error) {
      logger.error('投資失敗', { error, params });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `投資失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 手動觸發池狀態更新（用於測試）
   */
  async checkAndUpdatePoolStatus(poolAddress: string): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('手動觸發池狀態更新', { poolAddress });

    try {
      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::check_and_update_status`,
        arguments: [
          tx.object(poolAddress), // RWAPool 對象
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('池狀態更新成功', { txHash: result.digest });

      return result.digest;
    } catch (error) {
      logger.error('池狀態更新失敗', { error, poolAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `池狀態更新失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 結算投資池
   */
  async settlePool(poolAddress: string): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('開始結算投資池', { poolAddress });

    try {
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::settle_pool`,
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('投資池結算成功', { txHash: result.digest });

      return result.digest;
    } catch (error) {
      logger.error('投資池結算失敗', { error, poolAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `投資池結算失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 🧪 測試專用：修改投資池到期日
   */
  async updateMaturityDateForTesting(
    poolAddress: string,
    newMaturityTimestamp: number
  ): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('🧪 修改投資池到期日（測試用）', { poolAddress, newMaturityTimestamp });

    try {
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::update_maturity_date_for_testing`,
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
          tx.pure(newMaturityTimestamp), // 新的到期時間戳
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('✅ 投資池到期日修改成功', { txHash: result.digest });

      return result.digest;
    } catch (error) {
      logger.error('❌ 修改投資池到期日失敗', { error, poolAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `修改到期日失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 🧪 測試專用：更新池狀態到 MATURED
   */
  async updateStatusToMaturedForTesting(poolAddress: string): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('🧪 更新池狀態到 MATURED（測試用）', { poolAddress });

    try {
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      const tx = new TransactionBlock();

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::update_status_to_matured_for_testing`,
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('✅ 池狀態更新成功', { txHash: result.digest });

      return result.digest;
    } catch (error) {
      logger.error('❌ 更新池狀態失敗', { error, poolAddress });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `更新池狀態失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * Admin 注入收益到投資池
   */
  async depositYield(poolAddress: string, yieldAmount: number): Promise<string> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('💰 Admin 注入收益', { poolAddress, yieldAmount });

    try {
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      if (!this.getTreasuryCap()) {
        throw new Error('SUI_TAXCOIN_TREASURY_CAP 未配置');
      }

      const tx = new TransactionBlock();

      // 1. Mint TaxCoin 作為收益（使用 mint_coin 函數返回 Coin 對象）
      const amountInSmallestUnit = Math.floor(yieldAmount * Math.pow(10, 8));

      const yieldCoin = tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::taxcoin::mint_coin`,
        typeArguments: [],
        arguments: [
          tx.object(this.getTreasuryCap()), // TreasuryCap
          tx.object(this.getAdminCap()), // AdminCap
          tx.pure.u64(amountInSmallestUnit), // amount
        ],
      });

      // 2. 將收益注入投資池
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::deposit_yield`,
        typeArguments: [],
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
          yieldCoin, // 收益 Coin
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('✅ 收益注入成功', { txHash: result.digest, yieldAmount });

      return result.digest;
    } catch (error) {
      logger.error('❌ 注入收益失敗', { error, poolAddress, yieldAmount });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `注入收益失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 💰 注入收益並結算（合併為一個交易）
   */
  async depositYieldAndSettle(poolAddress: string, yieldAmount: number): Promise<{
    txHash: string;
    yieldAmount: number;
  }> {
    this.checkInitialized();
    this.checkConfig();

    logger.info('💰 注入收益並結算（單一交易）', { poolAddress, yieldAmount });

    try {
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      if (!this.getTreasuryCap()) {
        throw new Error('SUI_TAXCOIN_TREASURY_CAP 未配置');
      }

      const tx = new TransactionBlock();

      // 1. Mint TaxCoin 作為收益（使用 mint_coin 函數返回 Coin 對象）
      const amountInSmallestUnit = Math.floor(yieldAmount * Math.pow(10, 8));

      const yieldCoin = tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::taxcoin::mint_coin`,
        typeArguments: [],
        arguments: [
          tx.object(this.getTreasuryCap()), // TreasuryCap
          tx.object(this.getAdminCap()), // AdminCap
          tx.pure.u64(amountInSmallestUnit), // amount
        ],
      });

      // 2. 將收益注入投資池
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::deposit_yield`,
        typeArguments: [],
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
          yieldCoin, // 收益 Coin
        ],
      });

      // 3. 結算投資池
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::settle_pool`,
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.object(poolAddress), // RWAPool 對象
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair!,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      logger.info('✅ 收益注入並結算成功', { txHash: result.digest, yieldAmount });

      return {
        txHash: result.digest,
        yieldAmount,
      };
    } catch (error) {
      logger.error('❌ 注入收益並結算失敗', { error, poolAddress, yieldAmount });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `注入收益並結算失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 領取收益
   * 注意：此函數需要由投資者使用錢包簽名執行
   * 這裡只是構建交易數據
   */
  buildClaimYieldTransaction(
    poolAddress: string,
    poolShareNftId: string
  ): TransactionBlock {
    this.checkConfig();

    logger.info('構建領取收益交易', { poolAddress, poolShareNftId });

    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${config.sui.taxCoinPackageId}::rwa_pool::claim_yield`,
      arguments: [
        tx.object(poolAddress), // RWAPool 對象
        tx.object(poolShareNftId), // PoolShare NFT
      ],
    });

    return tx;
  }

  /**
   * 在區塊鏈上創建投資池
   */
  async createPoolOnChain(params: {
    poolName: string;
    description: string;
    targetAmount: number; // TWD
    yieldRate: number; // 例如 0.02 表示 2%
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    maturityDate: Date;
    claimIds?: string[];
  }): Promise<{
    txHash: string;
    poolContractId: string;
  }> {
    try {
      logger.info('開始在區塊鏈上創建投資池', params);

      // 驗證必要配置
      if (!config.sui.adminCapId) {
        throw new Error('SUI_RWA_POOL_ADMIN_CAP 未配置');
      }

      if (!this.keypair) {
        throw new Error('Sui 密鑰對未初始化');
      }

      // 風險等級映射
      const riskLevelMap = {
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2,
      };

      // 將金額轉換為最小單位（TaxCoin 使用 8 位小數）
      // 1 TWD = 10^8 最小單位
      const targetAmountInSmallestUnit = Math.floor(params.targetAmount * Math.pow(10, 8));

      // 將收益率轉換為基點 (例如 0.02 => 200)
      const yieldRateInBasisPoints = Math.floor(params.yieldRate * 10000);

      // 時間戳轉換為毫秒
      const maturityDateMs = params.maturityDate.getTime();

      const tx = new TransactionBlock();

      // 調用智能合約的 create_pool 函數
      // 將字串轉換為字節數組 (vector<u8>)
      const nameBytes = Array.from(Buffer.from(params.poolName, 'utf8'));
      const descBytes = Array.from(Buffer.from(params.description || '', 'utf8'));
      const claimIdsBytes = (params.claimIds || []).map(id =>
        Array.from(Buffer.from(id, 'utf8'))
      );

      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::rwa_pool::create_pool`,
        arguments: [
          tx.object(config.sui.adminCapId), // AdminCap
          tx.pure(nameBytes, 'vector<u8>'), // name
          tx.pure(descBytes, 'vector<u8>'), // description
          tx.pure(targetAmountInSmallestUnit, 'u64'), // target_amount
          tx.pure(yieldRateInBasisPoints, 'u64'), // yield_rate
          tx.pure(riskLevelMap[params.riskLevel], 'u8'), // risk_level
          tx.pure(maturityDateMs, 'u64'), // maturity_date
          tx.pure(claimIdsBytes, 'vector<vector<u8>>'), // claim_ids
        ],
      });

      const result = await this.client.signAndExecuteTransactionBlock({
        signer: this.keypair,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`交易失敗: ${result.effects?.status?.error}`);
      }

      // 從 objectChanges 中找到新創建的 RWAPool 對象
      const createdObjects = result.objectChanges?.filter(
        (change) => change.type === 'created'
      );

      const poolObject = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('rwa_pool::RWAPool')
      );

      const poolContractId = (poolObject as any)?.objectId || '';

      if (!poolContractId) {
        logger.error('無法獲取投資池對象 ID', { objectChanges: result.objectChanges });
        throw new Error('無法獲取投資池對象 ID');
      }

      logger.info('投資池創建成功', {
        txHash: result.digest,
        poolContractId,
      });

      return {
        txHash: result.digest,
        poolContractId,
      };
    } catch (error) {
      logger.error('創建投資池失敗', { error, params });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `創建投資池失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 緊急轉移靈魂綁定 NFT
   * 只有管理員可執行，用於處理錢包遺失等特殊情況
   *
   * @param params - 轉移參數
   * @returns 交易結果
   */
  async emergencyTransferNFT(params: {
    nftObjectId: string;
    newOwner: string;
    reason: string;
  }): Promise<{ txHash: string }> {
    const { nftObjectId, newOwner, reason } = params;

    logger.info('執行 NFT 緊急轉移', { nftObjectId, newOwner, reason });

    try {
      const tx = new TransactionBlock();

      // 調用智能合約的 emergency_transfer 函數
      tx.moveCall({
        target: `${config.sui.taxCoinPackageId}::tax_claim_nft::emergency_transfer`,
        arguments: [
          tx.object(config.sui.nftAdminCapId!), // AdminCap
          tx.object(nftObjectId), // NFT object
          tx.pure(newOwner, 'address'), // 新持有者地址
          tx.pure(Array.from(new TextEncoder().encode(reason))), // 轉移原因（轉換為 vector<u8>）
        ],
      });

      // 簽名並執行交易
      const result = await this.client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: this.keypair!,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // 檢查交易狀態
      if (result.effects?.status?.status !== 'success') {
        throw new Error(`NFT 緊急轉移交易失敗: ${result.effects?.status?.error || '未知錯誤'}`);
      }

      const txHash = result.digest;

      logger.info('NFT 緊急轉移成功', {
        txHash,
        nftObjectId,
        newOwner,
      });

      return { txHash };
    } catch (error) {
      logger.error('NFT 緊急轉移失敗', { error, params });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `NFT 緊急轉移失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 🛒 構建 TaxCoin 支付交易（QR Code 支付功能）
   * 旅客使用 TaxCoin 支付給店家
   *
   * 此函數只構建交易，需要由用戶錢包簽名執行
   */
  buildPaymentTransaction(params: {
    fromAddress: string;
    toAddress: string;
    amount: number; // TWD 分
  }): TransactionBlock {
    this.checkConfig();

    const { fromAddress, toAddress, amount } = params;

    logger.info('構建 TaxCoin 支付交易', { fromAddress, toAddress, amount });

    const tx = new TransactionBlock();

    // TaxCoin 使用 8 位小數精度
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));

    // 使用 PTB 構建轉帳交易
    // 注意：這需要用戶擁有 TaxCoin
    // 實際執行時會從用戶的 TaxCoin 對象中分割指定數量並轉給店家

    // 這個交易會在前端由用戶填入具體的 Coin 對象
    // 這裡只提供交易結構的參考
    tx.setGasBudget(10000000); // 設置 Gas 預算

    logger.info('TaxCoin 支付交易構建完成', {
      amountInSmallestUnit,
      taxCoinType: `${config.sui.taxCoinPackageId}::taxcoin::TAXCOIN`,
    });

    return tx;
  }

  /**
   * 🛒 查詢用戶的 TaxCoin Coin 對象
   * 用於前端構建支付交易時選擇正確的 Coin
   */
  async getTaxCoinObjects(walletAddress: string): Promise<Array<{
    coinObjectId: string;
    balance: number;
    version: string;
  }>> {
    try {
      if (!config.sui.taxCoinPackageId) {
        throw new BusinessError(
          ErrorCode.INTERNAL_ERROR,
          '未配置 TaxCoin Package ID'
        );
      }

      const coinType = `${config.sui.taxCoinPackageId}::taxcoin::TAXCOIN`;

      logger.info('🔍 開始查詢 TaxCoin Coin 對象', {
        walletAddress,
        packageId: config.sui.taxCoinPackageId,
        coinType,
      });

      // 查詢用戶持有的所有 TaxCoin 對象
      const coins = await this.client.getCoins({
        owner: walletAddress,
        coinType,
      });

      logger.info('📦 Sui RPC 返回的 Coin 數據', {
        walletAddress,
        coinType,
        hasNextPage: coins.hasNextPage,
        nextCursor: coins.nextCursor,
        dataLength: coins.data?.length || 0,
        rawData: JSON.stringify(coins.data, null, 2),
      });

      const taxCoinObjects = coins.data.map((coin) => ({
        coinObjectId: coin.coinObjectId,
        balance: Number(coin.balance) / Math.pow(10, 8), // 轉換為 TWD
        version: coin.version,
      }));

      logger.info('✅ 查詢 TaxCoin Coin 對象成功', {
        walletAddress,
        count: taxCoinObjects.length,
        totalBalance: taxCoinObjects.reduce((sum, c) => sum + c.balance, 0),
        objects: JSON.stringify(taxCoinObjects, null, 2),
      });

      return taxCoinObjects;
    } catch (error) {
      logger.error('❌ 查詢 TaxCoin Coin 對象失敗', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        walletAddress,
        packageId: config.sui.taxCoinPackageId,
      });
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `查詢 TaxCoin Coin 對象失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }
}

// 導出單例
export const suiService = new SuiService();
