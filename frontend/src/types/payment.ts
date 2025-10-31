/**
 * QR Code 支付功能 - TypeScript 類型定義
 */

// ===== Enums =====

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum InvoiceStatus {
  ISSUED = 'ISSUED',
  VOIDED = 'VOIDED',
}

// ===== Merchant =====

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
}

export interface MerchantStats {
  totalSales: number;
  totalOrders: number;
  todaySales: number;
  todayOrders: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    salesCount: number;
    totalRevenue: number;
  }>;
}

// ===== Product =====

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

export interface ProductListQuery {
  page?: number;
  limit?: number;
  status?: ProductStatus;
  category?: string;
}

// ===== Payment =====

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
  // Relations (when included)
  merchant?: Merchant;
  invoice?: Invoice;
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

export interface CreatePaymentQRCodeDto {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface ScanQRCodeDto {
  qrCodeData: string;
}

export interface ConfirmPaymentDto {
  transactionHash: string;
}

export interface PaymentListQuery {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}

// ===== Invoice =====

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
  merchantId: string;
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
  createdAt: Date;
  updatedAt: Date;
  // Relations (when included)
  payment?: Payment;
  merchant?: Merchant;
}

export interface VoidInvoiceDto {
  reason: string;
}

export interface InvoiceListQuery {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

// ===== API Response Types =====

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentResponse {
  payment: Payment;
  qrCodeData: QRCodePaymentData;
}

export interface PaymentHistoryResponse extends PaginatedResponse<Payment> {}

export interface InvoiceListResponse extends PaginatedResponse<Invoice> {}

export interface ProductListResponse extends PaginatedResponse<Product> {}
