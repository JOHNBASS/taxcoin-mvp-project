import { useState, useEffect } from 'react';
import userService, { User, UserBalance } from '../services/user.service';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, UserBalance>>({});
  const [loadingBalances, setLoadingBalances] = useState<Record<string, boolean>>({});
  const [mintingUserId, setMintingUserId] = useState<string | null>(null);
  const [mintAmounts, setMintAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (roleFilter) {
        params.role = roleFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await userService.getAllUsers(params);
      setUsers(response.users);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);

      // 為每個有錢包地址的用戶載入餘額
      response.users.forEach((user) => {
        if (user.walletAddress) {
          loadUserBalance(user.id);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserBalance = async (userId: string) => {
    setLoadingBalances((prev) => ({ ...prev, [userId]: true }));
    try {
      const balance = await userService.getUserBalances(userId);
      setBalances((prev) => ({ ...prev, [userId]: balance }));
    } catch (err) {
      console.error('載入餘額失敗:', err);
      // 靜默失敗，不影響整體 UI
    } finally {
      setLoadingBalances((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  const handleUpdateRole = async (userId: string, newRole: 'TOURIST' | 'INVESTOR' | 'MERCHANT' | 'ADMIN') => {
    try {
      setEditingUserId(userId);
      await userService.updateUserRole(userId, newRole);

      // 更新本地狀態
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );

      alert('角色更新成功');
    } catch (err) {
      alert(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setEditingUserId(null);
    }
  };

  const handleMintTaxCoin = async (userId: string) => {
    const amountStr = mintAmounts[userId];
    if (!amountStr || amountStr.trim() === '') {
      alert('請輸入鑄造數量');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('請輸入有效的數量（大於 0）');
      return;
    }

    if (!window.confirm(`確定要為此用戶鑄造 ${amount} TAXCOIN 嗎？`)) {
      return;
    }

    try {
      setMintingUserId(userId);
      const result = await userService.adminMintTaxCoin(userId, { amount });

      alert(`鑄造成功！\n數量: ${result.amount} TAXCOIN\n交易哈希: ${result.txHash.slice(0, 20)}...`);

      // 清空輸入框
      setMintAmounts((prev) => ({ ...prev, [userId]: '' }));

      // 重新載入該用戶的餘額
      await loadUserBalance(userId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '鑄造失敗');
    } finally {
      setMintingUserId(null);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'INVESTOR':
        return 'bg-primary-500/20 text-primary-400 border-primary-500/50';
      case 'MERCHANT':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'TOURIST':
        return 'bg-accent-500/20 text-accent-400 border-accent-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getKycBadgeClass = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-success/20 text-success border-success/50';
      case 'REJECTED':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'ADMIN': return '管理員';
      case 'INVESTOR': return '投資者';
      case 'MERCHANT': return '店家';
      case 'TOURIST': return '旅客';
      default: return role;
    }
  };

  const getKycDisplayName = (status: string) => {
    switch (status) {
      case 'VERIFIED': return '已驗證';
      case 'REJECTED': return '已拒絕';
      case 'PENDING': return '待驗證';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container-responsive py-8">
        <div className="card text-center py-12">
          <div className="inline-block w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-8">
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">使用者管理</h1>
          <p className="text-gray-400">管理所有註冊的錢包地址、角色和權限</p>
        </div>

        {/* 搜尋和篩選 */}
        <div className="card mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">搜尋</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="錢包地址、Email、DID..."
                  className="input flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button onClick={handleSearch} className="btn btn-primary">
                  搜尋
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">角色篩選</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input w-full"
              >
                <option value="">全部角色</option>
                <option value="TOURIST">旅客</option>
                <option value="MERCHANT">店家</option>
                <option value="INVESTOR">投資者</option>
                <option value="ADMIN">管理員</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setCurrentPage(1);
                  loadUsers();
                }}
                className="btn btn-secondary w-full"
              >
                清除篩選
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-400">
            共 {total} 位使用者
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="card mb-6 bg-red-500/10 border-red-500/50">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 使用者列表 */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    錢包地址
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    KYC 狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    SUI 餘額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    TAXCOIN 餘額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    註冊時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    鑄造 TAXCOIN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-mono">
                          {user.walletAddress ? (
                            <>
                              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                            </>
                          ) : (
                            <span className="text-gray-500">未設置</span>
                          )}
                        </div>
                        {/* ✅ 新增: 顯示 DID 資訊 */}
                        {user.did && (
                          <div className="flex items-center gap-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              user.did.startsWith('did:key:')
                                ? 'bg-success/20 text-success'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {user.did.startsWith('did:key:') ? 'W3C DID' : '舊格式'}
                            </span>
                            <span className="text-xs font-mono text-gray-400">
                              {user.did.slice(0, 12)}...
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {user.email || <span className="text-gray-500">未設置</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getKycBadgeClass(user.kycStatus)}`}>
                        {getKycDisplayName(user.kycStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.walletAddress ? (
                        loadingBalances[user.id] ? (
                          <span className="text-gray-500">載入中...</span>
                        ) : balances[user.id] ? (
                          <span className="font-mono text-blue-400">
                            {balances[user.id].suiBalance.toFixed(4)} SUI
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )
                      ) : (
                        <span className="text-gray-500">未設置</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {user.walletAddress ? (
                        loadingBalances[user.id] ? (
                          <span className="text-gray-500">載入中...</span>
                        ) : balances[user.id] ? (
                          <span className="font-mono text-primary-400">
                            {balances[user.id].taxcoinBalance.toFixed(2)} TAXCOIN
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )
                      ) : (
                        <span className="text-gray-500">未設置</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => {
                          const newRole = e.target.value as 'TOURIST' | 'INVESTOR' | 'MERCHANT' | 'ADMIN';
                          if (window.confirm(`確定要將此使用者的角色變更為「${getRoleDisplayName(newRole)}」嗎？`)) {
                            handleUpdateRole(user.id, newRole);
                          }
                        }}
                        disabled={editingUserId === user.id}
                        className="px-3 py-2 text-sm bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="TOURIST" className="bg-gray-800">旅客</option>
                        <option value="MERCHANT" className="bg-gray-800">店家</option>
                        <option value="INVESTOR" className="bg-gray-800">投資者</option>
                        <option value="ADMIN" className="bg-gray-800">管理員</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.walletAddress ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            placeholder="數量"
                            value={mintAmounts[user.id] || ''}
                            onChange={(e) =>
                              setMintAmounts((prev) => ({
                                ...prev,
                                [user.id]: e.target.value,
                              }))
                            }
                            disabled={mintingUserId === user.id}
                            className="w-28 px-3 py-2 text-sm bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            min="0.01"
                            step="0.01"
                          />
                          <button
                            onClick={() => handleMintTaxCoin(user.id)}
                            disabled={mintingUserId === user.id}
                            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold rounded-lg hover:from-primary-600 hover:to-accent-600 transition-all duration-200 shadow-lg hover:shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none whitespace-nowrap"
                          >
                            {mintingUserId === user.id ? '鑄造中...' : '鑄造'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">需要錢包</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                沒有找到使用者
              </div>
            )}
          </div>
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary"
            >
              上一頁
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`btn ${
                      currentPage === pageNum ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary"
            >
              下一頁
            </button>
          </div>
        )}

        {/* 使用說明 */}
        <div className="card mt-6 bg-blue-500/10 border-blue-500/50">
          <h3 className="font-semibold mb-2">使用說明</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• 您可以通過搜尋框查找特定的錢包地址、Email 或 DID</li>
            <li>• 使用角色篩選器快速查看特定角色的使用者</li>
            <li>• 直接在操作欄下拉選單中選擇新角色即可更新使用者權限</li>
            <li>• 旅客：可申請退稅、掃碼支付；店家：可收款、商品管理；投資者：可參與 RWA 投資；管理員：擁有所有權限</li>
            <li>• <span className="text-primary-400 font-semibold">SUI 餘額</span>：顯示用戶錢包中的 SUI Token 數量（用於支付 Gas 費）</li>
            <li>• <span className="text-primary-400 font-semibold">TAXCOIN 餘額</span>：顯示用戶錢包中的 TAXCOIN Token 數量（1 TAXCOIN = 1 TWD）</li>
            <li>• <span className="text-primary-400 font-semibold">鑄造 TAXCOIN</span>：輸入數量後點擊「鑄造」按鈕，可直接為用戶增加 TAXCOIN（需要錢包地址）</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
