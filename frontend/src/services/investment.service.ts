/**
 * 投資服務 - 前端直接構建交易並用錢包簽名
 */

import apiClient, { extractErrorMessage } from './api';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// ✅ 從環境變數讀取 Package ID
const TAXCOIN_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || '0xd5b297190ad103142d8e89e4ec3bac02757f055a07c252cfe23a15bd671a128b';
const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet' | 'localnet';

export interface PoolInfo {
  poolId: string;
  poolContractId: string;
  amount: number;
}

export interface BuildTxResponse {
  txBytes: string; // Base64 encoded transaction bytes
  poolId: string;
  amount: number;
  poolContractId: string;
}

export interface ConfirmInvestmentRequest {
  poolId: string;
  txDigest: string;
  poolShareNftId: string;
  amount: number;
}

class InvestmentService {
  /**
   * 步驟 1: 構建投資交易（後端）
   */
  async buildInvestmentTransaction(
    poolId: string,
    amount: number
  ): Promise<BuildTxResponse> {
    try {
      const response = await apiClient.post<any>('/investments/build-tx', {
        poolId,
        amount,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 步驟 2: 前端錢包簽名交易
   * @param txBytes Base64 encoded transaction bytes
   * @param signAndExecuteTransactionBlock Wallet function
   */
  async signAndExecuteTransaction(
    txBytes: string,
    signAndExecuteTransactionBlock: any
  ): Promise<{ digest: string; poolShareNftId: string }> {
    try {
      console.log('準備簽名交易，txBytes長度:', txBytes.length);

      // 將 base64 轉回 bytes
      const txBytesArray = Uint8Array.from(atob(txBytes), (c) => c.charCodeAt(0));
      console.log('轉換後的 txBytesArray 長度:', txBytesArray.length);

      // 從完整的 transaction bytes 重建交易
      const tx = Transaction.from(txBytesArray);
      console.log('成功從 bytes 創建交易');

      // 使用錢包簽名並執行
      console.log('開始錢包簽名...');
      const result = await signAndExecuteTransactionBlock({
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });

      console.log('Transaction result:', result);

      // 從 objectChanges 中找到新創建的 PoolShare NFT
      const createdObjects = result.objectChanges?.filter(
        (change: any) => change.type === 'created'
      );

      const poolShareNft = createdObjects?.find((obj: any) =>
        obj.objectType?.includes('PoolShare')
      );

      const poolShareNftId = poolShareNft?.objectId || '';

      if (!poolShareNftId) {
        console.error('無法找到 PoolShare NFT ID，objectChanges:', result.objectChanges);
        throw new Error('無法獲取投資憑證 NFT ID');
      }

      return {
        digest: result.digest,
        poolShareNftId,
      };
    } catch (error) {
      console.error('簽名交易失敗:', error);
      throw new Error(
        `簽名交易失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
      );
    }
  }

  /**
   * 步驟 3: 確認投資（後端記錄）
   */
  async confirmInvestment(data: ConfirmInvestmentRequest): Promise<any> {
    try {
      const response = await apiClient.post<any>('/investments/confirm', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }

  /**
   * 完整投資流程（前端直接構建交易）
   */
  async invest(
    poolId: string,
    amount: number,
    signAndExecuteTransactionBlock: any,
    walletAddress: string,
    poolContractId: string
  ): Promise<any> {
    console.log('開始投資流程', { poolId, amount, walletAddress, poolContractId });

    // 初始化 Sui Client
    const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });

    // 步驟 1: 獲取用戶的 TaxCoin
    const coinType = `${TAXCOIN_PACKAGE_ID}::taxcoin::TAXCOIN`;
    console.log('查詢用戶的 TaxCoin', { walletAddress, coinType });

    const coins = await client.getCoins({
      owner: walletAddress,
      coinType,
    });

    console.log('找到 TaxCoin coins:', coins.data.length);
    console.log('所有 Coins:', JSON.stringify(coins.data, null, 2));

    if (coins.data.length === 0) {
      throw new Error('您的錢包中沒有 TaxCoin，無法進行投資');
    }

    // 計算最小單位金額 (1 TWD = 10^8 smallest units)
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));
    console.log('計算金額', { amount, amountInSmallestUnit });

    // 找到餘額足夠的 Coin（按餘額從大到小排序）
    const sortedCoins = coins.data
      .map((coin) => ({
        ...coin,
        balanceNum: BigInt(coin.balance),
      }))
      .sort((a, b) => (a.balanceNum > b.balanceNum ? -1 : 1));

    console.log('排序後的 Coins:', sortedCoins.map(c => ({ id: c.coinObjectId, balance: c.balance })));

    // 找到第一個餘額足夠的 Coin
    const sufficientCoin = sortedCoins.find(
      (coin) => coin.balanceNum >= BigInt(amountInSmallestUnit)
    );

    if (!sufficientCoin) {
      const totalBalance = sortedCoins.reduce((sum, coin) => sum + coin.balanceNum, BigInt(0));
      const totalBalanceReadable = Number(totalBalance) / Math.pow(10, 8);
      throw new Error(
        `TaxCoin 餘額不足。需要: ${amount} TaxCoin，可用: ${totalBalanceReadable.toFixed(2)} TaxCoin`
      );
    }

    console.log('使用 TaxCoin:', {
      coinId: sufficientCoin.coinObjectId,
      balance: sufficientCoin.balance,
      balanceReadable: Number(sufficientCoin.balanceNum) / Math.pow(10, 8),
    });

    // 構建交易
    const tx = new Transaction();

    // 設置發送者（重要：錢包需要知道是誰發起交易）
    tx.setSender(walletAddress);

    const [paymentCoin] = tx.splitCoins(tx.object(sufficientCoin.coinObjectId), [
      amountInSmallestUnit,
    ]);

    // 調用智能合約 invest 函數
    tx.moveCall({
      target: `${TAXCOIN_PACKAGE_ID}::rwa_pool::invest`,
      arguments: [
        tx.object(poolContractId), // RWAPool 對象
        paymentCoin, // 支付的 TaxCoin
      ],
    });

    console.log('交易已構建，準備簽名', {
      sender: walletAddress,
      poolContractId,
      amountInSmallestUnit,
    });

    // 步驟 2: 前端錢包簽名並執行
    // 注意：Suiet Wallet 使用 transactionBlock 而不是 transaction
    const result = await signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('交易執行成功', result);
    console.log('完整 result 對象:', JSON.stringify(result, null, 2));
    console.log('result.effects:', result.effects);
    console.log('result.objectChanges:', result.objectChanges);
    console.log('result.effects?.created:', result.effects?.created);
    console.log('result.effects?.mutated:', result.effects?.mutated);

    // 方法: 使用交易 digest 從鏈上查詢 PoolShare NFT
    console.log('交易 digest:', result.digest);
    console.log('使用 SUI Client 查詢交易詳情...');

    const txDetails = await client.getTransactionBlock({
      digest: result.digest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('鏈上交易詳情:', JSON.stringify(txDetails, null, 2));

    // 從鏈上查詢結果中找到 PoolShare NFT
    const poolShareNft = txDetails.objectChanges?.find((change: any) => {
      const isPoolShare = change.objectType?.includes('PoolShare');
      const isRelevantType = change.type === 'created' || change.type === 'transferred';
      console.log('檢查對象:', {
        type: change.type,
        objectType: change.objectType,
        objectId: (change as any).objectId,
        isPoolShare,
        isRelevantType
      });
      return isPoolShare && isRelevantType;
    });

    console.log('找到的 PoolShare:', poolShareNft);

    const poolShareNftId = (poolShareNft as any)?.objectId || '';

    if (!poolShareNftId) {
      console.error('無法找到 PoolShare NFT ID');
      console.error('所有 objectChanges:', JSON.stringify(txDetails.objectChanges, null, 2));
      console.error('所有 events:', JSON.stringify(txDetails.events, null, 2));
      console.error('錢包地址:', walletAddress);
      console.error('Package ID:', TAXCOIN_PACKAGE_ID);
      throw new Error('無法獲取投資憑證 NFT ID。交易已成功但無法找到 NFT，請聯繫管理員。');
    }

    console.log('PoolShare NFT ID:', poolShareNftId);

    // 步驟 3: 後端確認並記錄投資
    const investment = await this.confirmInvestment({
      poolId,
      txDigest: result.digest,
      poolShareNftId,
      amount,
    });

    return investment;
  }
}

export default new InvestmentService();
