/**
 * 定時任務調度器服務
 *
 * 使用 node-cron 管理自動化任務
 */

import cron from 'node-cron';
import { logger } from '@/utils/logger.js';
import { distributeAllYields, settleAllMaturedInvestments } from '@/services/yieldDistribution.service.js';

/**
 * 收益分配定時任務
 * 每天凌晨 2:00 執行
 */
const yieldDistributionJob = cron.schedule(
  '0 2 * * *',
  async () => {
    logger.info('===== 開始執行收益分配定時任務 =====');

    try {
      const result = await distributeAllYields();

      logger.info('收益分配定時任務完成', {
        totalPools: result.totalPools,
        totalDistributed: result.totalDistributed,
        totalInvestors: result.totalInvestors,
      });
    } catch (error) {
      logger.error('收益分配定時任務失敗:', error);
    }

    logger.info('===== 收益分配定時任務結束 =====');
  },
  {
    scheduled: false,
    timezone: 'Asia/Taipei',
  }
);

/**
 * 到期投資結算定時任務
 * 每天凌晨 3:00 執行
 */
const investmentSettlementJob = cron.schedule(
  '0 3 * * *',
  async () => {
    logger.info('===== 開始執行到期投資結算定時任務 =====');

    try {
      const result = await settleAllMaturedInvestments();

      logger.info('到期投資結算定時任務完成', {
        totalInvestments: result.totalInvestments,
        totalSettled: result.totalSettled,
        totalYield: result.totalYield,
      });
    } catch (error) {
      logger.error('到期投資結算定時任務失敗:', error);
    }

    logger.info('===== 到期投資結算定時任務結束 =====');
  },
  {
    scheduled: false,
    timezone: 'Asia/Taipei',
  }
);

/**
 * 啟動所有定時任務
 */
export const startScheduler = () => {
  logger.info('啟動定時任務調度器');

  // 啟動收益分配任務 (每天凌晨 2:00)
  yieldDistributionJob.start();
  logger.info('✓ 收益分配定時任務已啟動 (每天凌晨 2:00)');

  // 啟動投資結算任務 (每天凌晨 3:00)
  investmentSettlementJob.start();
  logger.info('✓ 到期投資結算定時任務已啟動 (每天凌晨 3:00)');

  logger.info('所有定時任務已成功啟動');
};

/**
 * 停止所有定時任務
 */
export const stopScheduler = () => {
  logger.info('停止定時任務調度器');

  yieldDistributionJob.stop();
  investmentSettlementJob.stop();

  logger.info('所有定時任務已停止');
};

/**
 * 手動觸發收益分配
 * 用於測試或管理員手動執行
 */
export const triggerYieldDistribution = async () => {
  logger.info('手動觸發收益分配');

  try {
    const result = await distributeAllYields();
    logger.info('手動收益分配完成', result);
    return result;
  } catch (error) {
    logger.error('手動收益分配失敗:', error);
    throw error;
  }
};

/**
 * 手動觸發投資結算
 * 用於測試或管理員手動執行
 */
export const triggerInvestmentSettlement = async () => {
  logger.info('手動觸發投資結算');

  try {
    const result = await settleAllMaturedInvestments();
    logger.info('手動投資結算完成', result);
    return result;
  } catch (error) {
    logger.error('手動投資結算失敗:', error);
    throw error;
  }
};

/**
 * 獲取定時任務狀態
 */
export const getSchedulerStatus = () => {
  return {
    yieldDistribution: {
      name: '收益分配',
      schedule: '每天凌晨 2:00 (Asia/Taipei)',
      cronExpression: '0 2 * * *',
      running: yieldDistributionJob ? true : false,
    },
    investmentSettlement: {
      name: '到期投資結算',
      schedule: '每天凌晨 3:00 (Asia/Taipei)',
      cronExpression: '0 3 * * *',
      running: investmentSettlementJob ? true : false,
    },
  };
};
