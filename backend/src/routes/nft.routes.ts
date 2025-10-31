/**
 * NFT 路由
 *
 * 處理 NFT 圖片和元數據的路由
 */

import { Router } from 'express';
import { NFTController } from '@/controllers/nft.controller.js';

const router = Router();

// ===== 公開路由（無需認證）=====

// 通過申請 ID 獲取 NFT 圖片
router.get('/claim/:claimId/image', NFTController.getNFTImage);

// 通過申請 ID 獲取 NFT 元數據
router.get('/claim/:claimId/metadata', NFTController.getNFTMetadata);

// 通過 NFT Token ID 獲取圖片
router.get('/token/:tokenId/image', NFTController.getNFTImageByTokenId);

// 通過 NFT Token ID 獲取元數據
router.get('/token/:tokenId/metadata', NFTController.getNFTMetadataByTokenId);

export default router;
