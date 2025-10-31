import { Router } from 'express';
import { exchangeController } from '@/controllers/exchange.controller.js';

const router = Router();

/**
 * Exchange 兌換路由
 * Base path: /api/v1/exchange
 */

// 獲取流動性池信息
router.get('/pool', exchangeController.getPool.bind(exchangeController));

// 獲取兌換報價
router.post('/quote', exchangeController.getSwapQuote.bind(exchangeController));

// 執行兌換
router.post('/swap', exchangeController.swap.bind(exchangeController));

// 添加流動性
router.post(
  '/liquidity/add',
  exchangeController.addLiquidity.bind(exchangeController)
);

// 移除流動性
router.post(
  '/liquidity/remove',
  exchangeController.removeLiquidity.bind(exchangeController)
);

// 獲取我的 LP Tokens
router.get(
  '/my-lp-tokens',
  exchangeController.getMyLPTokens.bind(exchangeController)
);

// 獲取價格歷史
router.get(
  '/price-history',
  exchangeController.getPriceHistory.bind(exchangeController)
);

// 獲取統計數據
router.get('/stats', exchangeController.getStats.bind(exchangeController));

export default router;
