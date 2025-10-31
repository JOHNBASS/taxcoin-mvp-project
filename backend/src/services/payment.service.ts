/**
 * 支付服務
 * 處理 QR Code 生成、支付處理、交易記錄等功能
 */

import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';
import type {
  Payment,
  QRCodePaymentData,
  PaymentItem,
  PaymentHistoryQuery,
} from '@/types/payment.types.js';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { generateInvoice } from './invoice.service.js';
import { suiService } from './sui.service.js';

/**
 * 生成訂單編號
 */
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * 生成隨機 nonce
 */
const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * 創建支付 QR Code
 */
export const createPaymentQRCode = async (
  merchantId: string,
  items: PaymentItem[]
): Promise<{
  payment: Payment;
  qrCodeData: QRCodePaymentData;
}> => {
  logger.info('創建支付 QR Code', { merchantId, itemsCount: items.length });

  // 驗證店家存在且為 ACTIVE 狀態
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
  });

  if (!merchant) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '店家不存在');
  }

  if (merchant.status !== 'ACTIVE') {
    throw new BusinessError(ErrorCode.FORBIDDEN, '店家已被暫停');
  }

  // 驗證商品存在並計算金額
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      merchantId,
      status: 'ACTIVE',
    },
  });

  if (products.length !== productIds.length) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '部分商品不存在或已下架');
  }

  // 驗證庫存並計算金額
  let subtotal = 0;
  const validatedItems: PaymentItem[] = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      throw new BusinessError(ErrorCode.NOT_FOUND, `商品 ${item.productId} 不存在`);
    }

    if (product.stock < item.quantity) {
      throw new BusinessError(
        ErrorCode.INVALID_INPUT,
        `商品 "${product.name}" 庫存不足，當前庫存: ${product.stock}`
      );
    }

    const amount = product.price * item.quantity;
    subtotal += amount;

    validatedItems.push({
      productId: product.id,
      name: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      amount,
    });
  }

  // 計算稅額（5%）
  const tax = subtotal * 0.05;
  const total = subtotal + tax;

  // 生成訂單編號和過期時間
  const orderNumber = generateOrderNumber();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分鐘後過期

  // 構建 QR Code 數據
  const qrCodeData: QRCodePaymentData = {
    type: 'taxcoin_payment',
    version: '1.0',
    merchantId: merchant.id,
    merchantName: merchant.merchantName,
    merchantTaxId: merchant.taxId,
    merchantWalletAddress: merchant.walletAddress, // ✅ 添加商家錢包地址
    items: validatedItems,
    subtotal,
    tax,
    total,
    currency: 'TWD',
    timestamp: Date.now(),
    expiresAt: expiresAt.getTime(),
    nonce: generateNonce(),
  };

  // 創建支付記錄
  const payment = await prisma.payment.create({
    data: {
      // customerId 旅客掃描後才會填入，所以不設置
      merchantId,
      orderNumber,
      items: validatedItems as any,
      subtotal,
      tax,
      total,
      status: PaymentStatus.PENDING,
      qrCodeData: JSON.stringify(qrCodeData),
      expiresAt,
    },
  });

  logger.info('支付 QR Code 創建成功', {
    paymentId: payment.id,
    orderNumber,
    total,
  });

  return {
    payment: payment as unknown as Payment,
    qrCodeData,
  };
};

/**
 * 掃描 QR Code 並獲取支付詳情
 */
export const scanQRCode = async (
  qrCodeDataString: string
): Promise<{
  payment: Payment;
  qrCodeData: QRCodePaymentData;
}> => {
  logger.info('掃描 QR Code');

  let qrCodeData: QRCodePaymentData;
  try {
    qrCodeData = JSON.parse(qrCodeDataString);
  } catch (error) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, 'QR Code 格式錯誤');
  }

  // 驗證 QR Code 格式
  if (qrCodeData.type !== 'taxcoin_payment' || qrCodeData.version !== '1.0') {
    throw new BusinessError(ErrorCode.INVALID_INPUT, '不支持的 QR Code 類型');
  }

  // 檢查是否過期
  if (Date.now() > qrCodeData.expiresAt) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, 'QR Code 已過期，請重新生成');
  }

  // 查找支付記錄
  const payment = await prisma.payment.findFirst({
    where: {
      qrCodeData: qrCodeDataString,
      status: PaymentStatus.PENDING,
    },
    include: {
      merchant: true,
    },
  });

  if (!payment) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '支付記錄不存在或已完成');
  }

  return {
    payment: payment as unknown as Payment,
    qrCodeData,
  };
};

/**
 * 確認支付
 */
export const confirmPayment = async (
  paymentId: string,
  customerId: string,
  transactionHash: string
): Promise<{
  payment: Payment;
  invoice: any;
}> => {
  logger.info('確認支付', { paymentId, customerId, transactionHash });

  // 查找支付記錄
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      merchant: true,
    },
  });

  if (!payment) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '支付記錄不存在');
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, '支付已完成或已取消');
  }

  // 檢查是否過期
  if (new Date() > payment.expiresAt) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.CANCELLED },
    });
    throw new BusinessError(ErrorCode.INVALID_INPUT, '支付已過期');
  }

  // ✅ 驗證區塊鏈交易
  try {
    logger.info('驗證區塊鏈交易', { transactionHash });

    const tx = await suiService.getTransaction(transactionHash);

    // 檢查交易狀態
    if (tx.effects?.status?.status !== 'success') {
      throw new BusinessError(
        ErrorCode.BLOCKCHAIN_ERROR,
        `區塊鏈交易失敗: ${tx.effects?.status?.error || '未知錯誤'}`
      );
    }

    logger.info('✅ 區塊鏈交易驗證成功', { transactionHash });
  } catch (error) {
    logger.error('區塊鏈交易驗證失敗', { error, transactionHash });

    // 如果是查詢錯誤，可能是交易還在處理中，先允許繼續
    // 生產環境中應該更嚴格地處理這種情況
    if (error instanceof BusinessError) {
      throw error;
    }

    logger.warn('⚠️ 無法驗證交易，但允許繼續（需要後續人工審核）');
  }

  // 更新支付狀態
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      customerId,
      transactionHash,
      status: PaymentStatus.COMPLETED,
      paidAt: new Date(),
    },
  });

  // 扣減庫存
  const items = payment.items as unknown as PaymentItem[];
  for (const item of items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });
  }

  // 自動生成發票
  const invoice = await generateInvoice(paymentId);

  logger.info('支付確認成功', {
    paymentId,
    customerId,
    transactionHash,
    invoiceId: invoice.id,
  });

  return {
    payment: updatedPayment as unknown as Payment,
    invoice,
  };
};

/**
 * 獲取旅客的支付記錄
 */
export const getCustomerPayments = async (
  customerId: string,
  query: PaymentHistoryQuery
): Promise<{
  data: Payment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = { customerId };

  if (query.status) {
    where.status = query.status;
  }

  if (query.startDate || query.endDate) {
    where.paidAt = {};
    if (query.startDate) {
      where.paidAt.gte = query.startDate;
    }
    if (query.endDate) {
      where.paidAt.lte = query.endDate;
    }
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.total = {};
    if (query.minAmount !== undefined) {
      where.total.gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      where.total.lte = query.maxAmount;
    }
  }

  // Debug logging
  console.log('查詢條件:', JSON.stringify({ where, customerId, page, limit }, null, 2));

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        merchant: {
          select: {
            merchantName: true,
            taxId: true,
          },
        },
        invoice: true,
      },
    }),
    prisma.payment.count({ where }),
  ]);

  // Debug logging
  console.log('查詢結果:', JSON.stringify({ paymentsCount: payments.length, total, paymentIds: payments.map(p => p.id) }, null, 2));

  return {
    data: payments as unknown as Payment[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 獲取店家的支付記錄
 */
export const getMerchantPayments = async (
  merchantId: string,
  query: PaymentHistoryQuery
): Promise<{
  data: Payment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = { merchantId };

  if (query.status) {
    where.status = query.status;
  }

  if (query.startDate || query.endDate) {
    where.paidAt = {};
    if (query.startDate) {
      where.paidAt.gte = query.startDate;
    }
    if (query.endDate) {
      where.paidAt.lte = query.endDate;
    }
  }

  if (query.minAmount !== undefined || query.maxAmount !== undefined) {
    where.total = {};
    if (query.minAmount !== undefined) {
      where.total.gte = query.minAmount;
    }
    if (query.maxAmount !== undefined) {
      where.total.lte = query.maxAmount;
    }
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            walletAddress: true,
          },
        },
        invoice: true,
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data: payments as unknown as Payment[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 取消支付（過期或用戶取消）
 */
export const cancelPayment = async (paymentId: string): Promise<Payment> => {
  logger.info('取消支付', { paymentId });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '支付記錄不存在');
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, '只能取消待支付的訂單');
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.CANCELLED,
    },
  });

  logger.info('支付已取消', { paymentId });

  return updatedPayment as unknown as Payment;
};

/**
 * 根據 ID 獲取支付詳情
 */
export const getPaymentById = async (paymentId: string): Promise<Payment> => {
  logger.info('獲取支付詳情', { paymentId });

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      merchant: {
        select: {
          merchantName: true,
          taxId: true,
          walletAddress: true,
        },
      },
      customer: {
        select: {
          walletAddress: true,
        },
      },
      invoice: true,
    },
  });

  if (!payment) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '支付記錄不存在');
  }

  return payment as unknown as Payment;
};

/**
 * 獲取用戶的 TaxCoin Coin 對象
 */
export const getTaxCoinObjects = async (
  walletAddress: string
): Promise<Array<{
  coinObjectId: string;
  balance: number;
  version: string;
}>> => {
  logger.info('📍 [Payment Service] 獲取 TaxCoin Coin 對象', { walletAddress });

  try {
    const objects = await suiService.getTaxCoinObjects(walletAddress);
    logger.info('✅ [Payment Service] 成功獲取 TaxCoin Coin 對象', {
      walletAddress,
      count: objects.length,
      objects: JSON.stringify(objects, null, 2),
    });
    return objects;
  } catch (error) {
    logger.error('❌ [Payment Service] 獲取 TaxCoin Coin 對象失敗', { error, walletAddress });
    throw new BusinessError(
      ErrorCode.BLOCKCHAIN_ERROR,
      `獲取 TaxCoin Coin 對象失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    );
  }
};
