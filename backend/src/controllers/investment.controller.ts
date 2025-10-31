/**
 * 投資相關控制器
 * 處理前端錢包簽名的投資流程
 */

import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.js';
import { AuthRequest, ApiResponse, UserRole, ErrorCode } from '@/types/index.js';
import { ValidationError, NotFoundError, BusinessError } from '@/utils/errors.js';
import { logger } from '@/utils/logger.js';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { config } from '@/config/index.js';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

// ===== 請求驗證 Schema =====

const buildInvestTxSchema = z.object({
  poolId: z.string().min(1),
  amount: z.number().min(1, '最低投資金額為 1 TWD'),
});

const confirmInvestmentSchema = z.object({
  poolId: z.string().min(1),
  txDigest: z.string().min(1),
  poolShareNftId: z.string().min(1),
  amount: z.number().min(1),
});

/**
 * 構建投資交易（不簽名）
 * POST /api/v1/investments/build-tx
 */
export const buildInvestmentTransaction = async (
  req: AuthRequest,
  res: Response
) => {
  const userId = req.user!.userId;

  // 記錄收到的請求數據
  logger.info('收到投資交易構建請求', {
    body: req.body,
    userId,
  });

  // 驗證請求
  const parseResult = buildInvestTxSchema.safeParse(req.body);
  if (!parseResult.success) {
    logger.error('投資參數驗證失敗', {
      errors: parseResult.error.errors,
      receivedData: req.body,
    });
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { poolId, amount } = parseResult.data;

  // 檢查使用者角色
  if (req.user!.role !== UserRole.INVESTOR) {
    throw new ValidationError('僅投資者可以進行投資');
  }

  // 獲取用戶錢包地址
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    throw new ValidationError('用戶未綁定錢包地址');
  }

  // 獲取池資訊
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  // 檢查池是否有區塊鏈合約地址
  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  // 檢查池狀態
  if (pool.status !== 'RECRUITING') {
    throw new BusinessError(ErrorCode.POOL_FULL, '投資池不在募集狀態');
  }

  try {
    // 初始化 Sui 客戶端
    const client = new SuiClient({ url: getFullnodeUrl(config.sui.network) });

    const coinType = `${config.sui.taxCoinPackageId}::taxcoin::TAXCOIN`;
    logger.info('查詢用戶 TaxCoin 餘額', {
      walletAddress: user.walletAddress,
      coinType,
      packageId: config.sui.taxCoinPackageId,
    });

    // 獲取用戶的 TaxCoin
    const coins = await client.getCoins({
      owner: user.walletAddress,
      coinType,
    });

    logger.info('TaxCoin 查詢結果', {
      coinsCount: coins.data.length,
      coins: coins.data.map(c => ({
        id: c.coinObjectId,
        balance: c.balance,
        coinType: c.coinType,
      })),
    });

    if (coins.data.length === 0) {
      throw new BusinessError(
        ErrorCode.INSUFFICIENT_BALANCE,
        '您的錢包中沒有 TaxCoin'
      );
    }

    // 計算總餘額
    const totalBalance = coins.data.reduce(
      (sum, coin) => sum + BigInt(coin.balance),
      BigInt(0)
    );

    const balanceInCents = Number(totalBalance) / Math.pow(10, 8);

    if (balanceInCents < amount) {
      throw new BusinessError(
        ErrorCode.INSUFFICIENT_BALANCE,
        `TaxCoin 餘額不足: 需要 ${amount} TWD，當前餘額 ${balanceInCents} TWD`
      );
    }

    // 構建交易
    logger.info('開始構建投資交易', {
      userId,
      walletAddress: user.walletAddress,
      poolContractId: pool.poolContractId,
      amount,
      packageId: config.sui.taxCoinPackageId,
    });

    const tx = new TransactionBlock();
    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, 8));

    logger.info('計算投資金額', {
      amountTWD: amount,
      amountInSmallestUnit,
      decimals: 8,
    });

    // 使用第一個 coin 並分割出正確數量
    const firstCoin = coins.data[0]!;
    logger.info('準備分割 TaxCoin', {
      coinObjectId: firstCoin.coinObjectId,
      coinBalance: firstCoin.balance,
      splitAmount: amountInSmallestUnit,
    });

    const splitCoins = tx.splitCoins(tx.object(firstCoin.coinObjectId), [
      tx.pure(amountInSmallestUnit),
    ]);
    const paymentCoin = splitCoins[0];

    if (!paymentCoin) {
      throw new BusinessError(
        ErrorCode.INTERNAL_ERROR,
        '分割 TaxCoin 失敗'
      );
    }

    logger.info('TaxCoin 分割成功，準備調用智能合約');

    // 調用 rwa_pool::invest
    const moveCallTarget = `${config.sui.taxCoinPackageId}::rwa_pool::invest`;
    logger.info('調用智能合約 invest 函數', {
      target: moveCallTarget,
      poolContractId: pool.poolContractId,
      paymentCoin: 'splitCoins[0]',
    });

    tx.moveCall({
      target: `${config.sui.taxCoinPackageId}::rwa_pool::invest` as `${string}::${string}::${string}`,
      arguments: [
        tx.object(pool.poolContractId), // RWAPool 對象
        paymentCoin as any, // 支付的 TaxCoin
      ],
    });

    logger.info('智能合約調用已添加到交易，準備設置發送者');

    // 設置發送者
    logger.info('設置交易發送者', {
      sender: user.walletAddress,
    });

    try {
      tx.setSender(user.walletAddress);
      logger.info('發送者設置成功，準備構建交易');
    } catch (error) {
      logger.error('設置發送者失敗', {
        error: error instanceof Error ? error.message : String(error),
        walletAddress: user.walletAddress,
      });
      throw error;
    }

    // 將交易序列化為 bytes（前端錢包會自動處理 gas payment）
    logger.info('開始構建並序列化交易（前端錢包將處理 gas）');

    let txBytes: Uint8Array;
    try {
      // 構建完整交易（不設置 gas，前端錢包會自動處理）
      txBytes = await tx.build({
        client,
      });
      logger.info('交易構建成功（前端錢包將添加 gas）', {
        txBytesLength: txBytes.length,
      });
    } catch (error) {
      logger.error('構建交易失敗 - 詳細錯誤', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        sender: user.walletAddress,
        poolContractId: pool.poolContractId,
        moveCallTarget,
      });
      throw error;
    }

    logger.info('構建投資交易成功', {
      userId,
      poolId,
      amount,
      walletAddress: user.walletAddress,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        txBytes: Buffer.from(txBytes).toString('base64'),
        poolId,
        amount,
        poolContractId: pool.poolContractId,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('構建投資交易失敗', { error, poolId, amount });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `構建交易失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 確認投資（前端簽名後調用）
 * POST /api/v1/investments/confirm
 */
export const confirmInvestment = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  // 驗證請求
  const parseResult = confirmInvestmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { poolId, txDigest, poolShareNftId, amount } = parseResult.data;

  // 獲取池資訊
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  // 計算代幣數量和預期收益
  const totalTokenSupply = Number(pool.totalTokenSupply || 0);
  const targetAmount = Number(pool.targetAmount);
  const tokenAmount =
    totalTokenSupply > 0 ? (amount / targetAmount) * totalTokenSupply : amount;

  const maturityDate = new Date(pool.maturityDate);
  const now = new Date();
  const daysToMaturity = Math.max(
    0,
    Math.ceil((maturityDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
  const expectedYield = (amount * Number(pool.yieldRate) * daysToMaturity) / 36500;

  // 創建投資記錄
  const investment = await prisma.$transaction(async (tx) => {
    // 創建投資
    const inv = await tx.investment.create({
      data: {
        userId,
        poolId,
        investmentAmount: amount,
        tokenAmount,
        yieldAmount: expectedYield,
        transactionHash: txDigest,
        poolShareNftId,
      },
    });

    // 更新池的當前金額
    await tx.rwaPool.update({
      where: { id: poolId },
      data: {
        currentAmount: {
          increment: amount,
        },
      },
    });

    // 創建通知
    await tx.notification.create({
      data: {
        userId,
        title: '投資成功',
        message: `您已成功投資 ${amount} TWD 到 ${pool.poolName}，預期收益 ${expectedYield.toFixed(2)} TWD。交易哈希: ${txDigest}`,
        type: 'INVESTMENT_SUCCESS',
      },
    });

    return inv;
  });

  logger.info('投資確認成功', {
    investmentId: investment.id,
    userId,
    poolId,
    amount,
    txDigest,
    poolShareNftId,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      id: investment.id,
      poolId: investment.poolId,
      investmentAmount: investment.investmentAmount,
      tokenAmount: investment.tokenAmount,
      expectedYield: investment.yieldAmount,
      transactionHash: investment.transactionHash,
      poolShareNftId: investment.poolShareNftId,
      createdAt: investment.createdAt,
    },
  };

  return res.status(201).json(response);
};
