/**
 * QR Code 生成頁面 (店家) - Web3 風格
 * 店家選擇商品並生成支付 QR Code
 */

import React, { useState, useEffect } from 'react';
import QRCodeGenerator from '@/components/payment/QRCodeGenerator';
import ProductCard from '@/components/payment/ProductCard';
import { productService } from '@/services/product.service';
import { paymentService } from '@/services/payment.service';
import { ProductStatus } from '@/types/payment';
import type { Product, QRCodePaymentData, PaymentItem } from '@/types/payment';

interface CartItem extends PaymentItem {
  product: Product;
}

export const QRCodeGeneratorPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [qrCodeData, setQrCodeData] = useState<QRCodePaymentData | null>(null);
  const [qrCodeString, setQrCodeString] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now()); // 添加當前時間狀態

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Update countdown every second
    if (expiresAt > 0) {
      const interval = setInterval(() => {
        const now = Date.now();
        setCurrentTime(now); // 更新當前時間以觸發重新渲染

        if (now >= expiresAt) {
          setQrCodeData(null);
          setQrCodeString('');
          setExpiresAt(0);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [expiresAt]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const result = await productService.getMyProducts({
        page: 1,
        limit: 100,
        status: ProductStatus.ACTIVE,
      });
      // 後端返回的結構可能是 { products: [...] } 或 { data: [...] }
      const productsArray = (result as any).products || result.data || [];
      setProducts(Array.isArray(productsArray) ? productsArray : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProducts([]); // 設為空陣列避免錯誤
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    // Check if already in cart
    const existing = cart.find((item) => item.productId === product.id);

    if (existing) {
      // Remove from cart
      setCart(cart.filter((item) => item.productId !== product.id));
    } else {
      // Add to cart with quantity 1
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          amount: product.price,
          product,
        },
      ]);
    }
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setCart(
      cart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity,
              amount: item.unitPrice * quantity,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    return { subtotal, tax, total };
  };

  const handleGenerateQRCode = async () => {
    if (cart.length === 0) {
      alert('請先選擇商品');
      return;
    }

    setLoading(true);

    try {
      const items = cart.map(({ productId, quantity }) => ({
        productId,
        quantity,
      }));

      const result = await paymentService.createPaymentQRCode({ items });

      setQrCodeData(result.qrCodeData);
      setQrCodeString(JSON.stringify(result.qrCodeData));
      setExpiresAt(result.qrCodeData.expiresAt);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      alert('生成 QR Code 失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCart([]);
    setQrCodeData(null);
    setQrCodeString('');
    setExpiresAt(0);
  };

  const { subtotal, tax, total } = calculateTotals();
  const expiresIn = Math.max(0, Math.floor((expiresAt - currentTime) / 1000));
  const minutes = Math.floor(expiresIn / 60);
  const seconds = expiresIn % 60;

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden">
      {/* Web3 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 漸變光暈 */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />

        {/* 網格背景 */}
        <div className="grid-bg opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Web3 風格 */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-cyber flex items-center justify-center shadow-glow animate-float">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-green-400 bg-clip-text text-transparent">
              生成支付 QR Code
            </h1>
          </div>
          <p className="text-gray-400 ml-15">選擇商品並生成 Web3 支付碼給顧客掃描</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2 animate-slide-up">
            <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 hover:border-primary-500/50 shadow-glow transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-green-500" />

              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse shadow-glow-sm" />
                  <h2 className="text-lg font-semibold text-gray-200">選擇商品</h2>
                </div>

                {loadingProducts ? (
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-800 border-t-primary-500 mx-auto mb-4 shadow-glow" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                    </div>
                    <p className="text-gray-400 font-semibold">載入商品中...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-glow border border-gray-700">
                      <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <p className="text-gray-500 mb-4">尚無上架商品</p>
                    <a
                      href="/merchant/products"
                      className="btn btn-primary inline-flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      前往新增商品
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product, index) => (
                      <div
                        key={product.id}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="animate-slide-up"
                      >
                        <ProductCard
                          product={product}
                          mode="select"
                          selected={cart.some((item) => item.productId === product.id)}
                          onSelect={handleSelectProduct}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart & QR Code */}
          <div className="lg:col-span-1 animate-slide-up animation-delay-200">
            {/* Cart */}
            <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 hover:border-accent-500/50 shadow-glow transition-all duration-300 mb-6 sticky top-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-500 to-primary-500" />

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h2 className="text-lg font-semibold text-gray-200">購物車</h2>
                  </div>
                  <div className="px-3 py-1 bg-accent-500/20 border border-accent-500/50 rounded-full">
                    <span className="text-sm font-bold text-accent-300">{cart.length}</span>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-sm">尚未選擇商品</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto custom-scrollbar">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="border border-gray-700 rounded-lg p-3 bg-gray-800/50 hover:border-primary-500/50 transition-all duration-200"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm text-gray-200">{item.name}</h4>
                            <button
                              onClick={() => handleRemoveItem(item.productId)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                className="w-7 h-7 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600 border border-gray-600 transition-colors"
                              >
                                <span className="text-gray-300">−</span>
                              </button>
                              <span className="w-8 text-center font-semibold text-primary-400">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleQuantityChange(item.productId, item.quantity + 1)
                                }
                                className="w-7 h-7 flex items-center justify-center bg-gray-700 rounded hover:bg-gray-600 border border-gray-600 transition-colors"
                              >
                                <span className="text-gray-300">+</span>
                              </button>
                            </div>
                            <span className="font-bold text-sm text-green-400">
                              ${item.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-gray-700 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">小計</span>
                        <span className="text-gray-300">NT$ {subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">稅額 (5%)</span>
                        <span className="text-gray-300">NT$ {tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
                        <span className="text-gray-200">總計</span>
                        <span className="text-primary-400 shadow-glow-sm">
                          NT$ {total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <button
                      onClick={handleGenerateQRCode}
                      disabled={loading || cart.length === 0}
                      className="w-full mt-6 btn btn-primary relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            生成中...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            生成 QR Code
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* QR Code Display */}
            {qrCodeData && qrCodeString && (
              <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-green-500/50 shadow-glow-lg animate-slide-up">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-primary-500 to-accent-500 animate-pulse-slow" />

                <div className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-glow" />
                    <h2 className="text-lg font-semibold text-gray-200">支付 QR Code</h2>
                  </div>

                  {/* Countdown */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-yellow-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-2xl font-bold font-mono text-yellow-400 shadow-glow-sm">
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </p>
                    </div>
                    <p className="text-xs text-yellow-500">
                      QR Code 將在此時間後過期
                    </p>
                  </div>

                  {/* QR Code with Glow Effect */}
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                    <div className="relative bg-white p-4 rounded-2xl shadow-2xl">
                      <QRCodeGenerator
                        value={qrCodeString}
                        size={280}
                        level="H"
                        onDownload={() => console.log('QR Code downloaded')}
                      />
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">交易識別碼</span>
                        <span className="font-mono text-primary-400 text-xs">
                          {qrCodeData.nonce.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">金額</span>
                        <span className="font-bold text-green-400">
                          NT$ {qrCodeData.total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Payment Code */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-sm font-semibold text-blue-300">手動輸入支付碼</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(qrCodeString);
                          alert('支付碼已複製到剪貼簿');
                        }}
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-xs text-blue-300 transition-all duration-200 flex items-center gap-1"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        複製
                      </button>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <p className="text-xs font-mono text-gray-300 break-all leading-relaxed">
                        {qrCodeString}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      顧客可在支付頁面手動輸入此支付碼
                    </p>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full btn btn-secondary"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      重新生成
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGeneratorPage;
