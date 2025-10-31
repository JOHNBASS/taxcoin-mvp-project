/**
 * NFT 控制器
 *
 * 處理 NFT 圖片和元數據的請求
 */

import { Request, Response } from 'express';
import { prisma } from '@/utils/prisma.js';
import { NFTImageService } from '@/services/nftImage.service.js';
import { logger } from '@/utils/logger.js';
import { NotFoundError } from '@/utils/errors.js';

export class NFTController {
  /**
   * 獲取 NFT 圖片（SVG）
   */
  static async getNFTImage(req: Request, res: Response) {
    const { claimId } = req.params;

    logger.info('獲取 NFT 圖片', { claimId });

    try {
      // 查詢退稅申請資料
      const claim = await prisma.taxClaim.findUnique({
        where: { id: claimId },
        include: {
          user: {
            select: {
              did: true,
            },
          },
        },
      });

      if (!claim) {
        throw new NotFoundError('退稅申請不存在');
      }

      // 解析 OCR 結果
      const ocrData = claim.ocrResult as any;

      // 生成 SVG 圖片
      const svg = NFTImageService.generateNFTImage({
        claimId: claim.id,
        merchantName: claim.merchantName || ocrData?.merchantName || '未知商家',
        purchaseDate: claim.purchaseDate || ocrData?.purchaseDate || new Date().toISOString().split('T')[0],
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        did: claim.user.did || 'Unknown',
      });

      // 設置 Content-Type 為 SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 緩存 1 年
      res.send(svg);
    } catch (error) {
      logger.error('獲取 NFT 圖片失敗', { error, claimId });
      throw error;
    }
  }

  /**
   * 獲取 NFT 元數據（JSON）
   */
  static async getNFTMetadata(req: Request, res: Response) {
    const { claimId } = req.params;

    logger.info('獲取 NFT 元數據', { claimId });

    try {
      // 查詢退稅申請資料
      const claim = await prisma.taxClaim.findUnique({
        where: { id: claimId },
        include: {
          user: {
            select: {
              did: true,
            },
          },
        },
      });

      if (!claim) {
        throw new NotFoundError('退稅申請不存在');
      }

      // 解析 OCR 結果
      const ocrData = claim.ocrResult as any;

      // 生成元數據
      const metadata = NFTImageService.generateMetadata({
        claimId: claim.id,
        merchantName: claim.merchantName || ocrData?.merchantName || '未知商家',
        purchaseDate: claim.purchaseDate || ocrData?.purchaseDate || new Date().toISOString().split('T')[0],
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        did: claim.user.did || 'Unknown',
      });

      // 返回 JSON 元數據
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 緩存 1 年
      res.json(metadata);
    } catch (error) {
      logger.error('獲取 NFT 元數據失敗', { error, claimId });
      throw error;
    }
  }

  /**
   * 通過 NFT Token ID 獲取圖片
   */
  static async getNFTImageByTokenId(req: Request, res: Response) {
    const { tokenId } = req.params;

    logger.info('通過 Token ID 獲取 NFT 圖片', { tokenId });

    try {
      // 查詢 NFT 記錄
      const nft = await prisma.taxClaimNft.findFirst({
        where: { nftTokenId: tokenId },
        include: {
          taxClaim: {
            include: {
              user: {
                select: {
                  did: true,
                },
              },
            },
          },
        },
      });

      if (!nft || !nft.taxClaim) {
        throw new NotFoundError('NFT 不存在');
      }

      const claim = nft.taxClaim;
      const ocrData = claim.ocrResult as any;

      // 生成 SVG 圖片
      const svg = NFTImageService.generateNFTImage({
        claimId: claim.id,
        merchantName: claim.merchantName || ocrData?.merchantName || '未知商家',
        purchaseDate: claim.purchaseDate || ocrData?.purchaseDate || new Date().toISOString().split('T')[0],
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        did: claim.user.did || 'Unknown',
      });

      // 設置 Content-Type 為 SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 緩存 1 年
      res.send(svg);
    } catch (error) {
      logger.error('通過 Token ID 獲取 NFT 圖片失敗', { error, tokenId });
      throw error;
    }
  }

  /**
   * 通過 NFT Token ID 獲取元數據
   */
  static async getNFTMetadataByTokenId(req: Request, res: Response) {
    const { tokenId } = req.params;

    logger.info('通過 Token ID 獲取 NFT 元數據', { tokenId });

    try {
      // 查詢 NFT 記錄
      const nft = await prisma.taxClaimNft.findFirst({
        where: { nftTokenId: tokenId },
        include: {
          taxClaim: {
            include: {
              user: {
                select: {
                  did: true,
                },
              },
            },
          },
        },
      });

      if (!nft || !nft.taxClaim) {
        throw new NotFoundError('NFT 不存在');
      }

      const claim = nft.taxClaim;
      const ocrData = claim.ocrResult as any;

      // 生成元數據
      const metadata = NFTImageService.generateMetadata({
        claimId: claim.id,
        merchantName: claim.merchantName || ocrData?.merchantName || '未知商家',
        purchaseDate: claim.purchaseDate || ocrData?.purchaseDate || new Date().toISOString().split('T')[0],
        originalAmount: claim.originalAmount,
        taxAmount: claim.taxAmount,
        did: claim.user.did || 'Unknown',
      });

      // 更新 image URL 為絕對路徑
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      metadata.image = `${baseUrl}/api/v1/nft/token/${tokenId}/image`;

      // 返回 JSON 元數據
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 緩存 1 年
      res.json(metadata);
    } catch (error) {
      logger.error('通過 Token ID 獲取 NFT 元數據失敗', { error, tokenId });
      throw error;
    }
  }
}
