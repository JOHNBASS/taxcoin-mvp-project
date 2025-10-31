/**
 * 發票服務
 * 處理電子發票生成、查詢、作廢等功能
 */

import { prisma } from '@/utils/prisma.js';
import { logger } from '@/utils/logger.js';
import { BusinessError } from '@/utils/errors.js';
import { ErrorCode } from "@/types/index.js";
import { InvoiceStatus } from '@prisma/client';
import type { Invoice } from '@/types/payment.types.js';
import * as crypto from 'crypto';

/**
 * 生成發票號碼
 * 格式: AB-12345678
 */
const generateInvoiceNumber = (): string => {
  // 隨機字母 (A-Z)
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                  String.fromCharCode(65 + Math.floor(Math.random() * 26));

  // 隨機數字 (8位)
  const numbers = Math.floor(10000000 + Math.random() * 90000000);

  return `${letters}-${numbers}`;
};

/**
 * 生成發票 QR Code 數據
 * 符合台灣財政部電子發票規範（簡化版）
 */
const generateInvoiceQRCode = (invoice: {
  invoiceNumber: string;
  invoiceDate: Date;
  merchantTaxId: string;
  total: number;
}): string => {
  // 簡化版 QR Code 數據
  // 實際應包含: 發票號碼、日期、賣方統編、金額、隨機碼等
  const randomCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  const qrData = {
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.invoiceDate.toISOString().split('T')[0],
    sellerTaxId: invoice.merchantTaxId,
    amount: invoice.total,
    randomCode,
  };

  return JSON.stringify(qrData);
};

/**
 * 自動生成發票
 */
export const generateInvoice = async (paymentId: string): Promise<Invoice> => {
  logger.info('生成發票', { paymentId });

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

  if (payment.status !== 'COMPLETED') {
    throw new BusinessError(ErrorCode.INVALID_INPUT, '只能為已完成的支付生成發票');
  }

  // 檢查是否已有發票
  const existingInvoice = await prisma.invoice.findUnique({
    where: { paymentId },
  });

  if (existingInvoice) {
    logger.warn('發票已存在', { paymentId, invoiceId: existingInvoice.id });
    return existingInvoice as unknown as Invoice;
  }

  // 生成發票號碼
  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = new Date();

  // 生成發票 QR Code
  const qrCodeData = generateInvoiceQRCode({
    invoiceNumber,
    invoiceDate,
    merchantTaxId: payment.merchant.taxId,
    total: payment.total,
  });

  // 創建發票
  const invoice = await prisma.invoice.create({
    data: {
      paymentId,
      merchantId: payment.merchantId,
      invoiceNumber,
      invoiceDate,
      merchantTaxId: payment.merchant.taxId,
      merchantName: payment.merchant.merchantName,
      items: payment.items as any, // JsonValue to InputJsonValue
      subtotal: payment.subtotal,
      tax: payment.tax,
      total: payment.total,
      taxRate: 0.05,
      qrCodeData,
      status: InvoiceStatus.ISSUED,
    },
  });

  // 更新支付記錄的 invoiceId
  await prisma.payment.update({
    where: { id: paymentId },
    data: { invoiceId: invoice.id },
  });

  logger.info('發票生成成功', {
    invoiceId: invoice.id,
    invoiceNumber,
    paymentId,
  });

  return invoice as unknown as Invoice;
};

/**
 * 獲取發票詳情
 */
export const getInvoiceById = async (invoiceId: string): Promise<Invoice> => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payment: {
        include: {
          customer: {
            select: {
              walletAddress: true,
            },
          },
        },
      },
      merchant: true,
    },
  });

  if (!invoice) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '發票不存在');
  }

  return invoice as unknown as Invoice;
};

/**
 * 根據發票號碼查詢
 */
export const getInvoiceByNumber = async (invoiceNumber: string): Promise<Invoice> => {
  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      payment: true,
      merchant: true,
    },
  });

  if (!invoice) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '發票不存在');
  }

  return invoice as unknown as Invoice;
};

/**
 * 獲取店家的發票列表
 */
export const getMerchantInvoices = async (
  merchantId: string,
  params: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = { merchantId };

  if (params.status) {
    where.status = params.status;
  }

  if (params.startDate || params.endDate) {
    where.invoiceDate = {};
    if (params.startDate) {
      where.invoiceDate.gte = params.startDate;
    }
    if (params.endDate) {
      where.invoiceDate.lte = params.endDate;
    }
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: {
        payment: {
          include: {
            customer: {
              select: {
                walletAddress: true,
              },
            },
          },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    invoices: invoices as unknown as Invoice[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 作廢發票
 * 注意: 實際系統中通常只允許當日作廢
 */
export const voidInvoice = async (
  invoiceId: string,
  merchantId: string,
  voidReason: string
): Promise<Invoice> => {
  logger.info('作廢發票', { invoiceId, merchantId, voidReason });

  // 查找發票
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new BusinessError(ErrorCode.NOT_FOUND, '發票不存在');
  }

  if (invoice.merchantId !== merchantId) {
    throw new BusinessError(ErrorCode.FORBIDDEN, '無權作廢此發票');
  }

  if (invoice.status !== InvoiceStatus.ISSUED) {
    throw new BusinessError(ErrorCode.INVALID_INPUT, '發票已作廢或狀態異常');
  }

  // 檢查是否為當日發票（台灣電子發票規範）
  const today = new Date();
  const invoiceDate = new Date(invoice.invoiceDate);
  const isToday =
    today.getFullYear() === invoiceDate.getFullYear() &&
    today.getMonth() === invoiceDate.getMonth() &&
    today.getDate() === invoiceDate.getDate();

  if (!isToday) {
    throw new BusinessError(
      ErrorCode.INVALID_INPUT,
      '只能作廢當日開立的發票'
    );
  }

  // 作廢發票
  const voidedInvoice = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: InvoiceStatus.VOIDED,
      voidedAt: new Date(),
      voidReason,
    },
  });

  logger.info('發票作廢成功', { invoiceId, invoiceNumber: invoice.invoiceNumber });

  return voidedInvoice as unknown as Invoice;
};

/**
 * 獲取旅客的發票列表
 */
export const getCustomerInvoices = async (
  customerId: string,
  params: {
    page?: number;
    limit?: number;
  }
): Promise<{
  invoices: Invoice[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> => {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;

  // 通過支付記錄查找發票
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        payment: {
          customerId,
        },
      },
      skip,
      take: limit,
      orderBy: { invoiceDate: 'desc' },
      include: {
        merchant: {
          select: {
            merchantName: true,
            taxId: true,
          },
        },
      },
    }),
    prisma.invoice.count({
      where: {
        payment: {
          customerId,
        },
      },
    }),
  ]);

  return {
    invoices: invoices as unknown as Invoice[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
