/**
 * QR Code 支付功能 - TypeScript 類型定義
 */

import { MerchantStatus, ProductStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';

// ===== 店家相關 =====

export interface Merchant {
  id: string;
  userId: string;
  merchantName: string;
  taxId: string;
  ownerName: string;
  phone: string;
  address: string;
  businessType: string;
  walletAddress: string;
  status: MerchantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMerchantDto {
  merchantName: string;
  taxId: string;
  ownerName: string;
  phone: string;
  address: string;
  businessType: string;
  walletAddress: string;
}

export interface UpdateMerchantDto {
  merchantName?: string;
  phone?: string;
  address?: string;
  businessType?: string;
  walletAddress?: string;
  status?: MerchantStatus;
}

// ===== 商品相關 =====

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  status?: ProductStatus;
}

// ===== 支付相關 =====

export interface PaymentItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  customerId: string;
  merchantId: string;
  orderNumber: string;
  items: PaymentItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: PaymentStatus;
  transactionHash?: string;
  invoiceId?: string;
  qrCodeData: string;
  expiresAt: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QRCodePaymentData {
  type: 'taxcoin_payment';
  version: '1.0';
  merchantId: string;
  merchantName: string;
  merchantTaxId: string;
  merchantWalletAddress: string; // ✅ 商家錢包地址
  items: PaymentItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: 'TWD';
  timestamp: number;
  expiresAt: number;
  nonce: string;
}

export interface CreatePaymentDto {
  items: PaymentItem[];
  merchantId: string;
}

export interface ConfirmPaymentDto {
  paymentId: string;
  transactionHash: string;
}

// ===== 發票相關 =====

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  merchantTaxId: string;
  merchantName: string;
  buyerTaxId?: string;
  buyerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  qrCodeData: string;
  status: InvoiceStatus;
  voidedAt?: Date;
  voidReason?: string;
  merchantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvoiceDto {
  paymentId: string;
  merchantTaxId: string;
  merchantName: string;
  buyerTaxId?: string;
  buyerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface VoidInvoiceDto {
  invoiceId: string;
  voidReason: string;
}

// ===== 統計相關 =====

export interface MerchantStats {
  todayTransactions: number;
  todayRevenue: number;
  monthRevenue: number;
  totalTaxCoinEarned: number;
}

export interface PaymentHistoryQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}
