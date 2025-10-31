import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '@/utils/prisma.js';
import { AuthRequest, ApiResponse, UserRole } from '@/types/index.js';
import {
  ValidationError,
  NotFoundError,
  BusinessError,
} from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import { logger } from '@/utils/logger.js';
import {
  calculateFillRate,
  calculateTokenAmount,
  calculateExpectedYield,
  calculateDaysToMaturity,
  checkPoolAvailability,
  validateInvestmentAmount,
  updatePoolStatus,
} from '@/services/rwaPool.service.js';
import { suiService } from '@/services/sui.service.js';

// ===== 請求驗證 Schema =====

const createPoolSchema = z.object({
  poolName: z.string().min(1, '池名稱不能為空'),
  targetAmount: z.number().min(10, '目標金額至少 10 TWD'), // 降低限制以便測試
  yieldRate: z.number().min(0).max(30, '收益率必須在 0-30% 之間'),
  maturityDate: z.string().refine((date) => {
    const maturity = new Date(date);
    const now = new Date();
    return maturity > now;
  }, '到期日必須是未來日期'),
  totalTokenSupply: z.number().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

const investSchema = z.object({
  amount: z.number().min(100, '最低投資金額為 100 TWD'),
});

// ===== 控制器函數 =====

/**
 * 創建 RWA 投資池 (管理員)
 * POST /api/v1/admin/rwa-pools
 */
export const createPool = async (req: AuthRequest, res: Response) => {
  // 記錄請求內容
  logger.info(`收到創建投資池請求: ${JSON.stringify(req.body, null, 2)}`);

  // 驗證請求
  const parseResult = createPoolSchema.safeParse(req.body);
  if (!parseResult.success) {
    logger.error(`參數驗證失敗: ${JSON.stringify(parseResult.error.errors, null, 2)}`);
    logger.error(`請求內容: ${JSON.stringify(req.body, null, 2)}`);
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { poolName, targetAmount, yieldRate, maturityDate, totalTokenSupply, riskLevel } =
    parseResult.data;

  // 步驟 1: 先部署到區塊鏈
  let poolContractId: string | undefined;
  let txHash: string | undefined;

  try {
    const blockchainResult = await suiService.createPoolOnChain({
      poolName,
      description: `投資池: ${poolName}`,
      targetAmount,
      yieldRate,
      riskLevel: riskLevel || 'MEDIUM',
      maturityDate: new Date(maturityDate),
      claimIds: [],
    });

    poolContractId = blockchainResult.poolContractId;
    txHash = blockchainResult.txHash;

    logger.info('投資池已部署到區塊鏈', {
      poolContractId,
      txHash,
    });
  } catch (error) {
    logger.error('部署投資池到區塊鏈失敗', { error });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `部署投資池到區塊鏈失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }

  // 步驟 2: 創建資料庫記錄（包含 poolContractId）
  const pool = await prisma.rwaPool.create({
    data: {
      poolName,
      targetAmount,
      yieldRate,
      maturityDate: new Date(maturityDate),
      totalTokenSupply: totalTokenSupply || targetAmount * 100, // 預設代幣供應量
      status: 'RECRUITING',
      poolContractId, // 儲存區塊鏈合約地址
      riskLevel: riskLevel || 'MEDIUM',
    },
  });

  logger.info('RWA 投資池創建成功', {
    poolId: pool.id,
    poolName,
    targetAmount,
    poolContractId,
    txHash,
  });

  // 轉換為前端期望的格式
  const target = Number(pool.targetAmount);
  const totalTokens = Number(pool.totalTokenSupply || 0);
  const sharePrice = totalTokens > 0 ? target / totalTokens : 100;

  const response: ApiResponse = {
    success: true,
    data: {
      id: pool.id,
      name: pool.poolName,
      poolName: pool.poolName,
      description: pool.description || '',
      targetAmount: target,
      currentAmount: Number(pool.currentAmount),
      totalValue: target,
      sharePrice: sharePrice,
      totalShares: totalTokens,
      availableShares: totalTokens,
      yieldRate: Number(pool.yieldRate),
      maturityDate: pool.maturityDate,
      status: pool.status,
      riskLevel: pool.riskLevel,
      fillRate: 0,
      investorCount: 0,
      poolContractId: pool.poolContractId || undefined,
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt,
    },
  };

  return res.status(201).json(response);
};

/**
 * 獲取所有投資池列表
 * GET /api/v1/rwa-pools
 */
export const getAllPools = async (req: AuthRequest, res: Response) => {
  // 解析查詢參數
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [pools, total] = await Promise.all([
    prisma.rwaPool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        investments: {
          select: { userId: true }, // 查詢 userId 用於去重統計唯一投資人數
        },
        items: {
          select: { id: true },
        },
      },
    }),
    prisma.rwaPool.count({ where }),
  ]);

  // 計算每個池的填充率和剩餘天數,並轉換為前端期望的格式
  const poolsWithStats = pools.map((pool) => {
    const invested = Number(pool.currentAmount);
    const target = Number(pool.targetAmount);
    const totalTokenSupply = Number(pool.totalTokenSupply || 0);

    // 假設每份價格 = 目標金額 / 代幣供應量
    const sharePrice = totalTokenSupply > 0 ? target / totalTokenSupply : 100;
    const totalShares = totalTokenSupply;
    const investedShares = totalTokenSupply > 0 ? (invested / target) * totalTokenSupply : 0;
    const availableShares = totalShares - investedShares;

    // ✅ 統計唯一投資人數（去重）
    const uniqueInvestors = new Set(pool.investments?.map((inv) => inv.userId) || []);
    const investorCount = uniqueInvestors.size;

    return {
      id: pool.id,
      name: pool.poolName,
      poolName: pool.poolName,
      description: pool.description || '',
      targetAmount: target,
      currentAmount: invested,
      totalValue: target,
      sharePrice: sharePrice,
      totalShares: totalShares,
      availableShares: availableShares,
      yieldRate: Number(pool.yieldRate),
      maturityDate: pool.maturityDate,
      status: pool.status,
      riskLevel: pool.riskLevel,
      poolContractId: pool.poolContractId || undefined,
      fillRate: calculateFillRate(invested, target),
      daysToMaturity: calculateDaysToMaturity(pool.maturityDate),
      itemCount: pool.items?.length || 0,
      investorCount, // 使用去重後的唯一投資人數
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt,
    };
  });

  const response: ApiResponse = {
    success: true,
    data: {
      pools: poolsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };

  return res.json(response);
};

/**
 * 獲取單一投資池詳情
 * GET /api/v1/rwa-pools/:id
 */
export const getPoolById = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;
  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
    include: {
      items: {
        include: {
          taxClaim: {
            select: {
              id: true,
              taxAmount: true,
              createdAt: true,
            },
          },
        },
      },
      investments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              walletAddress: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // 最近 10 筆投資
      },
    },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  // 更新池狀態
  await updatePoolStatus(poolId);

  // 轉換為前端期望的格式
  const invested = Number(pool.currentAmount);
  const target = Number(pool.targetAmount);
  const totalTokenSupply = Number(pool.totalTokenSupply || 0);

  const sharePrice = totalTokenSupply > 0 ? target / totalTokenSupply : 100;
  const totalShares = totalTokenSupply;
  const investedShares = totalTokenSupply > 0 ? (invested / target) * totalTokenSupply : 0;
  const availableShares = totalShares - investedShares;

  // ✅ 統計唯一投資人數（去重）- 從完整的投資記錄中統計
  const allInvestments = await prisma.investment.findMany({
    where: { poolId },
    select: { userId: true },
  });
  const uniqueInvestors = new Set(allInvestments.map((inv) => inv.userId));
  const investorCount = uniqueInvestors.size;

  const response: ApiResponse = {
    success: true,
    data: {
      id: pool.id,
      name: pool.poolName,
      poolName: pool.poolName,
      description: pool.description || '',
      targetAmount: target,
      currentAmount: invested,
      totalValue: target,
      sharePrice: sharePrice,
      totalShares: totalShares,
      availableShares: availableShares,
      yieldRate: Number(pool.yieldRate),
      maturityDate: pool.maturityDate,
      status: pool.status,
      riskLevel: pool.riskLevel,
      totalTokenSupply: pool.totalTokenSupply,
      poolContractId: pool.poolContractId || undefined,
      fillRate: calculateFillRate(invested, target),
      daysToMaturity: calculateDaysToMaturity(pool.maturityDate),
      items: pool.items,
      recentInvestments: pool.investments, // 最近 10 筆投資（可能重複用戶）
      investorCount, // 唯一投資人數
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt,
    },
  };

  return res.json(response);
};

/**
 * 投資到池中
 * POST /api/v1/rwa-pools/:id/invest
 */
export const investToPool = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const poolId = req.params.id;

  // 記錄請求內容
  logger.info(`收到投資請求: poolId=${poolId}, body=${JSON.stringify(req.body)}`);

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  // 檢查使用者角色
  if (req.user!.role !== UserRole.INVESTOR) {
    throw new ValidationError('僅投資者可以進行投資');
  }

  // 驗證請求
  const parseResult = investSchema.safeParse(req.body);
  if (!parseResult.success) {
    logger.error(`投資參數驗證失敗: ${JSON.stringify(parseResult.error.errors)}`);
    logger.error(`收到的請求內容: ${JSON.stringify(req.body)}`);
    throw new ValidationError('請求參數錯誤', parseResult.error.errors);
  }

  const { amount } = parseResult.data;

  // 檢查池是否可投資
  const availability = await checkPoolAvailability(poolId);
  if (!availability.available) {
    throw new BusinessError(
      ErrorCode.POOL_FULL,
      availability.reason || '投資池不可用'
    );
  }

  // 驗證投資金額
  const validation = await validateInvestmentAmount(amount, poolId);
  if (!validation.valid) {
    throw new ValidationError(validation.reason || '投資金額無效');
  }

  // 獲取池資訊
  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  // 獲取用戶錢包地址
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletAddress: true },
  });

  if (!user?.walletAddress) {
    throw new ValidationError('用戶未綁定錢包地址');
  }

  // 計算代幣數量
  const tokenAmount = calculateTokenAmount(
    amount,
    Number(pool.totalTokenSupply || 0),
    Number(pool.targetAmount)
  );

  // 計算預期收益
  const daysToMaturity = calculateDaysToMaturity(pool.maturityDate);
  const expectedYield = calculateExpectedYield(
    amount,
    Number(pool.yieldRate),
    daysToMaturity
  );

  logger.info('準備執行區塊鏈投資交易', {
    userId,
    walletAddress: user.walletAddress,
    poolId,
    poolContractId: pool.poolContractId,
    amount,
  });

  // 檢查池是否有區塊鏈合約地址
  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  // 執行區塊鏈投資交易
  let blockchainResult;
  try {
    blockchainResult = await suiService.investToPool({
      poolAddress: pool.poolContractId,
      investorAddress: user.walletAddress,
      amount,
    });

    logger.info('區塊鏈投資交易成功', {
      txHash: blockchainResult.txHash,
      poolShareNftId: blockchainResult.poolShareNftId,
    });
  } catch (error) {
    logger.error('區塊鏈投資交易失敗', { error });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `區塊鏈投資失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }

  // 創建投資記錄（區塊鏈交易成功後才記錄）
  const investment = await prisma.$transaction(async (tx) => {
    // 創建投資
    const inv = await tx.investment.create({
      data: {
        userId,
        poolId,
        investmentAmount: amount,
        tokenAmount,
        yieldAmount: expectedYield,
        transactionHash: blockchainResult.txHash,
        poolShareNftId: blockchainResult.poolShareNftId,
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
        message: `您已成功投資 ${amount} TWD 到 ${pool.poolName}，預期收益 ${expectedYield} TWD。交易哈希: ${blockchainResult.txHash}`,
        type: 'INVESTMENT_SUCCESS',
      },
    });

    return inv;
  });

  // 更新池狀態 (檢查是否已滿額)
  await updatePoolStatus(poolId);

  logger.info('投資成功', {
    investmentId: investment.id,
    userId,
    poolId,
    amount,
    tokenAmount,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      id: investment.id,
      poolId: investment.poolId,
      investmentAmount: investment.investmentAmount,
      tokenAmount: investment.tokenAmount,
      expectedYield: investment.yieldAmount,
      createdAt: investment.createdAt,
    },
  };

  return res.status(201).json(response);
};

/**
 * 獲取我的投資列表
 * GET /api/v1/rwa-pools/my-investments
 */
export const getMyInvestments = async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        pool: {
          select: {
            id: true,
            poolName: true,
            yieldRate: true,
            maturityDate: true,
            status: true,
          },
        },
      },
    }),
    prisma.investment.count({ where: { userId } }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: {
      investments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };

  return res.json(response);
};

/**
 * 手動觸發池狀態更新 (管理員 - 測試用)
 * POST /api/v1/admin/rwa-pools/:id/check-status
 */
export const checkPoolStatus = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  try {
    const txHash = await suiService.checkAndUpdatePoolStatus(pool.poolContractId);

    logger.info('池狀態更新成功', { poolId, txHash });

    // 重新獲取池資訊
    const updatedPool = await prisma.rwaPool.findUnique({
      where: { id: poolId },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash,
        pool: updatedPool,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('池狀態更新失敗', { error, poolId });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `池狀態更新失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 結算投資池 (管理員)
 * POST /api/v1/admin/rwa-pools/:id/settle
 */
export const settlePool = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  // 檢查池狀態
  if (pool.status !== 'FULL' && pool.status !== 'MATURED') {
    throw new BusinessError(
      ErrorCode.VALIDATION_ERROR,
      '只有已滿額或已到期的池才能結算'
    );
  }

  try {
    // 1. 計算應注入的收益金額
    // 收益 = 當前金額 × 年化收益率 × (持有天數 / 365)
    const currentAmount = pool.currentAmount;
    const yieldRate = pool.yieldRate;
    const maturityDate = new Date(pool.maturityDate);
    const createdDate = new Date(pool.createdAt);
    const holdingDays = Math.max(1, Math.ceil((maturityDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));

    // 計算收益，確保至少為 1（如果有投資金額）
    let totalYield = Math.floor(currentAmount * yieldRate * (holdingDays / 365));

    // 如果計算出的收益為 0 但有投資金額，設為最小值 1
    if (totalYield === 0 && currentAmount > 0 && yieldRate > 0) {
      totalYield = 1;
    }

    logger.info('計算收益金額', {
      poolId,
      currentAmount,
      yieldRate,
      holdingDays,
      totalYield,
      maturityDate: maturityDate.toISOString(),
      createdDate: createdDate.toISOString(),
    });

    // 檢查收益是否有效
    if (totalYield <= 0) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        `無法計算收益：當前金額=${currentAmount}, 收益率=${yieldRate}, 持有天數=${holdingDays}`
      );
    }

    // 2. 注入收益並結算（合併為單一交易，避免 AdminCap 版本衝突）
    logger.info('開始注入收益並結算', { poolId, totalYield });
    const result = await suiService.depositYieldAndSettle(pool.poolContractId, totalYield);
    logger.info('收益注入並結算成功', { poolId, txHash: result.txHash });

    // 3. 更新資料庫狀態
    await prisma.rwaPool.update({
      where: { id: poolId },
      data: {
        status: 'SETTLED',
      },
    });

    logger.info('投資池結算完成', { poolId, txHash: result.txHash, totalYield });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash: result.txHash,
        totalYield,
        message: `投資池已結算！已自動注入收益 ${totalYield.toLocaleString()} TWD，投資者現在可以領取收益`,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('投資池結算失敗', { error, poolId });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `投資池結算失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 🧪 測試專用：修改投資池到期日
 * POST /api/v1/admin/rwa-pools/:id/update-maturity-date
 */
export const updateMaturityDateForTesting = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;
  const { maturityDate } = req.body;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  if (!maturityDate) {
    throw new ValidationError('缺少 maturityDate 參數');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  try {
    // 轉換為時間戳
    const newMaturityTimestamp = new Date(maturityDate).getTime();

    // 調用區塊鏈修改到期日
    const txHash = await suiService.updateMaturityDateForTesting(
      pool.poolContractId,
      newMaturityTimestamp
    );

    // 更新資料庫
    await prisma.rwaPool.update({
      where: { id: poolId },
      data: {
        maturityDate: new Date(maturityDate),
      },
    });

    logger.info('✅ 投資池到期日已修改（測試用）', { poolId, maturityDate, txHash });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash,
        maturityDate: new Date(maturityDate),
        message: '到期日已修改（測試用）',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('❌ 修改到期日失敗', { error, poolId });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `修改到期日失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * Admin 注入收益到投資池
 * POST /api/v1/admin/rwa-pools/:id/deposit-yield
 */
export const depositYield = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;
  const { yieldAmount } = req.body;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  if (yieldAmount === undefined || yieldAmount <= 0) {
    throw new ValidationError('收益金額必須大於 0');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
    include: {
      investments: true,
    },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  try {
    // 調用區塊鏈注入收益
    const txHash = await suiService.depositYield(pool.poolContractId, yieldAmount);

    logger.info('✅ 收益注入成功', { poolId, yieldAmount, txHash });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash,
        yieldAmount,
        message: `已注入 ${yieldAmount} TWD 收益到投資池`,
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('❌ 注入收益失敗', { error, poolId, yieldAmount });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `注入收益失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 🧪 測試專用：更新池狀態到 MATURED
 */
export const updateStatusToMaturedForTesting = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  const pool = await prisma.rwaPool.findUnique({
    where: { id: poolId },
  });

  if (!pool) {
    throw new NotFoundError('投資池不存在');
  }

  if (!pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  try {
    // 調用區塊鏈更新狀態
    const txHash = await suiService.updateStatusToMaturedForTesting(pool.poolContractId);

    // 更新資料庫狀態
    await prisma.rwaPool.update({
      where: { id: poolId },
      data: {
        status: 'MATURED',
      },
    });

    logger.info('✅ 池狀態已更新到 MATURED（測試用）', { poolId, txHash });

    const response: ApiResponse = {
      success: true,
      data: {
        txHash,
        message: '池狀態已更新到 MATURED',
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('❌ 更新池狀態失敗', { error, poolId });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `更新池狀態失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 構建領取收益交易 (投資者)
 * POST /api/v1/rwa-pools/:id/build-claim-transaction
 */
export const buildClaimTransaction = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;
  const userId = req.user!.userId;
  const { walletAddress } = req.body;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  if (!walletAddress) {
    throw new ValidationError('缺少 walletAddress 參數');
  }

  // 獲取投資記錄
  const investment = await prisma.investment.findFirst({
    where: {
      poolId,
      userId,
    },
    include: {
      pool: true,
    },
  });

  if (!investment) {
    throw new NotFoundError('未找到投資記錄');
  }

  if (!investment.pool.poolContractId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '投資池未部署到區塊鏈'
    );
  }

  if (!investment.poolShareNftId) {
    throw new BusinessError(
      ErrorCode.INTERNAL_ERROR,
      '未找到 PoolShare NFT ID'
    );
  }

  // 檢查池狀態
  if (investment.pool.status !== 'SETTLED') {
    throw new BusinessError(
      ErrorCode.VALIDATION_ERROR,
      '投資池尚未結算，無法領取收益'
    );
  }

  try {
    // 構建交易
    const tx = suiService.buildClaimYieldTransaction(
      investment.pool.poolContractId,
      investment.poolShareNftId
    );

    // 設置 sender 並序列化交易
    tx.setSender(walletAddress);
    const txBytes = await tx.build({ client: suiService['client'] });

    // 轉換為 Base64
    const txBytesBase64 = Buffer.from(txBytes).toString('base64');

    const response: ApiResponse = {
      success: true,
      data: {
        transactionBytes: txBytesBase64, // 返回 Base64 字符串
        poolAddress: investment.pool.poolContractId,
        poolShareNftId: investment.poolShareNftId,
        expectedPrincipal: investment.investmentAmount,
        expectedYield: investment.yieldAmount,
        expectedTotal: Number(investment.investmentAmount) + Number(investment.yieldAmount || 0),
      },
    };

    return res.json(response);
  } catch (error) {
    logger.error('構建領取收益交易失敗', { error, poolId, userId });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `構建交易失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};

/**
 * 確認領取收益完成 (投資者)
 * POST /api/v1/rwa-pools/:id/confirm-claim
 */
export const confirmClaimYield = async (req: AuthRequest, res: Response) => {
  const poolId = req.params.id;
  const userId = req.user!.userId;
  const { transactionHash } = req.body;

  if (!poolId) {
    throw new ValidationError('缺少 poolId 參數');
  }

  if (!transactionHash) {
    throw new ValidationError('缺少 transactionHash 參數');
  }

  // 查找投資記錄
  const investment = await prisma.investment.findFirst({
    where: {
      poolId,
      userId,
    },
  });

  if (!investment) {
    throw new NotFoundError('未找到投資記錄');
  }

  // 檢查是否已經領取過
  if (investment.status === 'REDEEMED') {
    logger.warn('投資已經領取過', { poolId, userId, investmentId: investment.id });
    const response: ApiResponse = {
      success: true,
      data: {
        message: '收益已經領取過了',
        investment,
      },
    };
    return res.json(response);
  }

  // 更新投資狀態為已領取
  const updatedInvestment = await prisma.investment.update({
    where: { id: investment.id },
    data: {
      status: 'REDEEMED',
      redeemedAt: new Date(),
    },
    include: {
      pool: true,
    },
  });

  logger.info('收益領取確認成功', {
    poolId,
    userId,
    investmentId: investment.id,
    transactionHash,
  });

  const response: ApiResponse = {
    success: true,
    data: {
      message: '收益領取成功',
      investment: updatedInvestment,
      transactionHash,
    },
  };

  return res.json(response);
};

/**
 * 獲取投資池統計 (管理員)
 * GET /api/v1/admin/rwa-pools/stats
 */
export const getPoolStats = async (_req: AuthRequest, res: Response) => {
  const [
    totalPools,
    activePools,
    totalInvestment,
    averageYield,
    poolsData,
  ] = await Promise.all([
    prisma.rwaPool.count(),
    prisma.rwaPool.count({ where: { status: 'RECRUITING' } }),
    prisma.investment.aggregate({
      _sum: { investmentAmount: true },
    }),
    prisma.rwaPool.aggregate({
      _avg: { yieldRate: true },
    }),
    prisma.rwaPool.findMany({
      select: {
        targetAmount: true,
        currentAmount: true,
      },
    }),
  ]);

  // 計算總池價值和平均填充率
  let totalValue = 0;
  let totalFillRate = 0;

  poolsData.forEach(pool => {
    totalValue += pool.targetAmount;
    const fillRate = pool.targetAmount > 0 ? (pool.currentAmount / pool.targetAmount) * 100 : 0;
    totalFillRate += fillRate;
  });

  const averageFillRate = poolsData.length > 0 ? totalFillRate / poolsData.length : 0;

  const response: ApiResponse = {
    success: true,
    data: {
      totalPools,
      activePools,
      totalValue,
      totalInvested: totalInvestment._sum?.investmentAmount || 0,
      averageFillRate,
      averageYield: averageYield._avg?.yieldRate || 0,
    },
  };

  return res.json(response);
};
