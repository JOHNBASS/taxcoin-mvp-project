/**
 * Invoice API Service
 * 發票相關 API 請求
 */

import axios from 'axios';
import type {
  Invoice,
  VoidInvoiceDto,
  InvoiceListQuery,
  InvoiceListResponse,
} from '@/types/payment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const invoiceService = {
  /**
   * 獲取發票詳情
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/invoices/${invoiceId}`);
    return response.data.data.invoice;
  },

  /**
   * 根據發票號碼查詢
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<Invoice> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/invoices/number/${invoiceNumber}`
    );
    return response.data.data.invoice;
  },

  /**
   * 獲取旅客的發票列表
   */
  async getCustomerInvoices(query?: InvoiceListQuery): Promise<InvoiceListResponse> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/invoices/my/list`, {
      params: query,
    });
    return response.data.data;
  },

  /**
   * 獲取店家的發票列表
   */
  async getMerchantInvoices(query?: InvoiceListQuery): Promise<InvoiceListResponse> {
    const response = await axios.get(`${API_BASE_URL}/api/v1/invoices/merchant/list`, {
      params: query,
    });
    return response.data.data;
  },

  /**
   * 作廢發票（店家）
   */
  async voidInvoice(invoiceId: string, data: VoidInvoiceDto): Promise<Invoice> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/invoices/${invoiceId}/void`,
      data
    );
    return response.data.data.invoice;
  },

  /**
   * 下載發票 PDF
   */
  async downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/invoices/${invoiceId}/download`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  },
};
