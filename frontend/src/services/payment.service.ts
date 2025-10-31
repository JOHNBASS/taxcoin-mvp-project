/**
 * Payment API Service
 * 支付相關 API 請求
 */

import apiClient, { extractErrorMessage } from './api';
import type {
  Payment,
  CreatePaymentQRCodeDto,
  ScanQRCodeDto,
  ConfirmPaymentDto,
  PaymentListQuery,
  PaymentResponse,
  PaymentHistoryResponse,
  QRCodePaymentData,
} from '@/types/payment';

export const paymentService = {
  /**
   * 生成支付 QR Code（店家）
   */
  async createPaymentQRCode(data: CreatePaymentQRCodeDto): Promise<PaymentResponse> {
    try {
      const response = await apiClient.post('/payments/qrcode', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 掃描 QR Code（旅客）
   */
  async scanQRCode(data: ScanQRCodeDto): Promise<{
    payment: Payment;
    qrCodeData: QRCodePaymentData;
  }> {
    try {
      const response = await apiClient.post('/payments/scan', data);
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 確認支付（旅客）
   */
  async confirmPayment(paymentId: string, data: ConfirmPaymentDto): Promise<Payment> {
    try {
      const response = await apiClient.post(
        `/payments/${paymentId}/confirm`,
        data
      );
      return response.data.data.payment;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 取消支付
   */
  async cancelPayment(paymentId: string): Promise<Payment> {
    try {
      const response = await apiClient.post(
        `/payments/${paymentId}/cancel`
      );
      return response.data.data.payment;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取支付詳情
   */
  async getPaymentById(paymentId: string): Promise<Payment> {
    try {
      const response = await apiClient.get(`/payments/${paymentId}`);
      return response.data.data.payment;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取旅客支付記錄
   */
  async getCustomerPayments(query?: PaymentListQuery): Promise<PaymentHistoryResponse> {
    try {
      const response = await apiClient.get('/payments/my/history', {
        params: query,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取店家收款記錄
   */
  async getMerchantPayments(query?: PaymentListQuery): Promise<PaymentHistoryResponse> {
    try {
      const response = await apiClient.get('/payments/merchant/history', {
        params: query,
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  },

  /**
   * 獲取 TaxCoin Coin 對象
   */
  async getTaxCoinObjects(walletAddress: string): Promise<Array<{
    coinObjectId: string;
    balance: number;
    version: string;
  }>> {
    try {
      console.log('📍 [Payment Service] 開始獲取 TaxCoin...', { walletAddress });
      const response = await apiClient.get('/payments/taxcoin-objects', {
        params: { walletAddress },
      });
      console.log('✅ [Payment Service] API 回應:', response.data);
      const objects = response.data.data.objects;
      console.log('✅ [Payment Service] 解析後的 objects:', objects);
      return objects;
    } catch (error) {
      console.error('❌ [Payment Service] 獲取 TaxCoin 失敗:', error);
      throw new Error(extractErrorMessage(error));
    }
  },
};
