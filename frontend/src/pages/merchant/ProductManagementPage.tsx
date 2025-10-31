/**
 * 商品管理頁面 (店家) - Web3 風格
 * 管理商品的新增、編輯、刪除、上下架
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from '@/components/payment/ProductCard';
import ProductFormModal from '@/components/merchant/ProductFormModal';
import { productService } from '@/services/product.service';
import { ProductStatus } from '@/types/payment';
import type { Product, CreateProductDto, UpdateProductDto } from '@/types/payment';

type ViewMode = 'grid' | 'list';

export const ProductManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([
    '餐飲美食',
    '飲料',
    '小吃點心',
    '紀念品',
    '文創商品',
    '服飾配件',
    '其他',
  ]);
  const [merchantNotRegistered, setMerchantNotRegistered] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const result = await productService.getMyProducts({
        page: 1,
        limit: 100,
      });
      // 後端返回的結構可能是 { products: [...] } 或 { data: [...] }
      // 確保正確提取商品陣列
      const productsArray = (result as any).products || result.data || [];
      setProducts(Array.isArray(productsArray) ? productsArray : []);
      setMerchantNotRegistered(false);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      // 設為空陣列避免 filter 錯誤
      setProducts([]);
      // 檢查是否是"尚未註冊店家"的錯誤
      if (err.message && err.message.includes('尚未註冊店家')) {
        setMerchantNotRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await productService.getCategories();
      if (cats.length > 0) {
        setCategories(cats);
      }
    } catch (err: any) {
      console.error('Failed to fetch categories:', err);
      // 檢查是否是"尚未註冊店家"的錯誤
      if (err.message && err.message.includes('尚未註冊店家')) {
        setMerchantNotRegistered(true);
      }
    }
  };

  const handleCreateProduct = async (data: CreateProductDto) => {
    await productService.createProduct(data);
    await fetchProducts();
  };

  const handleUpdateProduct = async (data: UpdateProductDto) => {
    if (!editingProduct) return;
    await productService.updateProduct(editingProduct.id, data);
    await fetchProducts();
  };

  const handleDeleteProduct = async (productId: string) => {
    await productService.deleteProduct(productId);
    await fetchProducts();
  };

  const handleToggleStatus = async (productId: string, status: ProductStatus) => {
    await productService.updateProduct(productId, { status });
    await fetchProducts();
  };

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? product.status === statusFilter : true;
    const matchesCategory = categoryFilter
      ? product.category === categoryFilter
      : true;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden">
      {/* Web3 背景效果 */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 漸變光暈 */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-1000" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-2000" />

        {/* 網格背景 */}
        <div className="grid-bg opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header - Web3 風格 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-cyber flex items-center justify-center shadow-glow">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-400 via-accent-400 to-green-400 bg-clip-text text-transparent">
                商品管理
              </h1>
            </div>
            <p className="text-gray-400 ml-15">管理您的 Web3 商品清單</p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary group relative overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增商品
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* 尚未註冊店家提示 */}
        {merchantNotRegistered && (
          <div className="card bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/50 mb-8 animate-slide-up">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-yellow-400">尚未註冊店家</h3>
              <p className="text-gray-300">
                您需要先註冊店家資訊才能管理商品。請點擊下方按鈕完成店家註冊。
              </p>
              <button
                onClick={() => navigate('/merchant/register')}
                className="btn btn-accent mx-auto"
              >
                ✨ 立即註冊店家
              </button>
            </div>
          </div>
        )}

        {/* Filters & Search - 賽博龐克卡片 */}
        <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 hover:border-primary-500/50 shadow-glow transition-all duration-300 mb-6 animate-slide-up">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-green-500" />

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  🔍 搜尋商品
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="輸入商品名稱..."
                    className="input pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📊 狀態
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}
                  className="input"
                >
                  <option value="">全部狀態</option>
                  <option value="ACTIVE">上架中</option>
                  <option value="INACTIVE">已下架</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  🏷️ 分類
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input"
                >
                  <option value="">全部分類</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 pt-4 border-t border-gray-800 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse shadow-glow-sm" />
                <p className="text-sm text-gray-400">
                  共 <span className="text-primary-400 font-semibold">{filteredProducts.length}</span> 個商品
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-gradient-cyber text-white shadow-glow'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    卡片檢視
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                    viewMode === 'list'
                      ? 'bg-gradient-cyber text-white shadow-glow'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    列表檢視
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Display */}
        {loading ? (
          <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 p-12 text-center animate-slide-up">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-800 border-t-primary-500 mx-auto mb-4 shadow-glow" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
            </div>
            <p className="text-gray-400 font-semibold">載入商品資料中...</p>
            <p className="text-gray-600 text-sm mt-2">正在從區塊鏈同步</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 p-12 text-center animate-slide-up">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-glow border border-gray-700">
                <svg
                  className="w-12 h-12 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-500 rounded-full animate-ping opacity-75" />
            </div>

            <h3 className="text-xl font-bold text-gray-300 mb-2">
              {searchTerm || statusFilter || categoryFilter
                ? '沒有符合條件的商品'
                : '尚無商品'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter || categoryFilter
                ? '請調整篩選條件或清除搜尋'
                : '開始新增您的第一個 Web3 商品'}
            </p>

            <button
              onClick={() => handleOpenModal()}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增第一個商品
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-slide-up"
              >
                <ProductCard
                  product={product}
                  mode="manage"
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteProduct}
                  onToggleStatus={handleToggleStatus}
                />
              </div>
            ))}
          </div>
        ) : (
          /* List View - Web3 風格 */
          <div className="card bg-dark-card/80 backdrop-blur-xl border-2 border-gray-800 overflow-hidden shadow-glow animate-slide-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-green-500" />

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      商品
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      分類
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      價格
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      庫存
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.imageUrl && (
                            <div className="relative mr-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-700"
                              />
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-tr from-primary-500/20 to-transparent" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-200">{product.name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-500/20 text-accent-300 border border-accent-500/30">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-green-400">
                          NT$ {product.price.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-semibold ${
                            product.stock === 0
                              ? 'text-red-400'
                              : product.stock < 10
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                            product.status === 'ACTIVE'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-glow-sm'
                              : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${
                            product.status === 'ACTIVE' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                          }`} />
                          {product.status === 'ACTIVE' ? '上架中' : '已下架'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(product)}
                            className="px-3 py-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors border border-primary-500/30 rounded-lg hover:bg-primary-500/10"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                product.id,
                                product.status === ProductStatus.ACTIVE ? ProductStatus.INACTIVE : ProductStatus.ACTIVE
                              )
                            }
                            className="px-3 py-1 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition-colors border border-yellow-500/30 rounded-lg hover:bg-yellow-500/10"
                          >
                            {product.status === 'ACTIVE' ? '下架' : '上架'}
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('確定要刪除此商品嗎？此操作無法復原。')) {
                                handleDeleteProduct(product.id);
                              }
                            }}
                            className="px-3 py-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors border border-red-500/30 rounded-lg hover:bg-red-500/10"
                          >
                            刪除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Product Form Modal */}
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
          product={editingProduct}
          categories={categories}
        />
      </div>
    </div>
  );
};

export default ProductManagementPage;
