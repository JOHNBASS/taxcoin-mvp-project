/**
 * 錢包工具函數
 * MVP 階段使用簡化的錢包連接方式
 * 後續可整合 Sui Wallet Kit 或其他 Wallet SDK
 */

export interface WalletAdapter {
  address: string | null;
  connected: boolean;
  connect: () => Promise<string>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<{ signature: string; publicKey: string }>;
}

/**
 * 獲取 Wallet Standard 的錢包列表
 */
const getWalletStandardWallets = (): any[] => {
  try {
    // 方法 1: 標準的 getWallets() 函數
    if (typeof (window as any).getWallets === 'function') {
      const wallets = (window as any).getWallets();
      if (wallets && wallets.length > 0) {
        console.log('Found wallets via getWallets():', wallets);
        return wallets;
      }
    }

    // 方法 2: 通過 __WALLET_STANDARD_APP_INTERFACE__ 獲取
    const appInterface = (window as any).__WALLET_STANDARD_APP_INTERFACE__;
    if (appInterface && appInterface.get) {
      const wallets = appInterface.get();
      if (wallets && wallets.length > 0) {
        console.log('Found wallets via __WALLET_STANDARD_APP_INTERFACE__:', wallets);
        return wallets;
      }
    }

    return [];
  } catch (error) {
    console.warn('Error getting Wallet Standard wallets:', error);
    return [];
  }
};

/**
 * 檢查是否安裝了 Sui 錢包
 * 支援多種錢包: Sui Wallet, Suiet, Ethos, Slush 等
 */
export const hasSuiWallet = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 檢查標準 Wallet API (Sui Wallet, Suiet, Ethos 等)
  const hasStandardWallet = 'suiWallet' in window;

  // 檢查舊版 API
  const hasLegacyWallet = 'sui' in window;

  // 檢查 Wallet Standard (Slush 等現代錢包)
  const hasWalletStandard = getWalletStandardWallets().length > 0;

  console.log('Wallet detection:', {
    hasStandardWallet,
    hasLegacyWallet,
    hasWalletStandard,
    walletStandardCount: getWalletStandardWallets().length
  });

  return hasStandardWallet || hasLegacyWallet || hasWalletStandard;
};

/**
 * 簡化版錢包適配器 (使用 window.suiWallet 或模擬)
 */
class SimplifiedWalletAdapter implements WalletAdapter {
  address: string | null = null;
  connected: boolean = false;

  /**
   * 連接錢包
   */
  async connect(): Promise<string> {
    try {
      // 檢查是否有 Sui 錢包
      if (hasSuiWallet()) {
        console.log('Sui wallet detected, attempting to connect...');

        // 方法 1: 嘗試 Wallet Standard API (Slush, 現代錢包)
        const walletStandardWallets = getWalletStandardWallets();
        if (walletStandardWallets.length > 0) {
          console.log('Trying Wallet Standard API (for Slush and modern wallets)...');
          console.log('Available wallets:', walletStandardWallets);

          try {
            const wallet = walletStandardWallets[0]; // 使用第一個可用的錢包
            console.log('Using wallet:', wallet.name || 'Unknown');
            console.log('Wallet features:', Object.keys(wallet.features || {}));

            // 請求連接
            const connectFeature = wallet.features['standard:connect'];
            if (connectFeature && connectFeature.connect) {
              const accounts = await connectFeature.connect();
              console.log('Wallet connection result:', accounts);

              if (accounts && accounts.accounts && accounts.accounts.length > 0) {
                this.address = accounts.accounts[0].address;
                this.connected = true;
                console.log('Connected to wallet:', this.address);
                return this.address as string;
              }
            } else {
              console.warn('Wallet does not support standard:connect feature');
            }
          } catch (err) {
            console.warn('Wallet Standard API failed, trying other methods...', err);
          }
        }

        // 方法 2: 嘗試標準 Wallet API (Sui Wallet, Suiet 等)
        if ('suiWallet' in window) {
          const wallet = (window as any).suiWallet;
          console.log('Using suiWallet API');

          // 請求連接權限
          const result = await wallet.requestPermissions();
          console.log('Wallet connection result:', result);

          if (result && result.accounts && result.accounts.length > 0) {
            this.address = result.accounts[0].address;
            this.connected = true;
            console.log('Connected to wallet:', this.address);
            return this.address as string;
          }
        }

        // 方法 3: 嘗試舊版 API
        if ('sui' in window) {
          const wallet = (window as any).sui;
          console.log('Using legacy sui API');

          const result = await wallet.connect();
          if (result && result.address) {
            this.address = result.address;
            this.connected = true;
            console.log('Connected to wallet (legacy):', this.address);
            return this.address as string;
          }
        }
      }

      // MVP 階段:如果沒有錢包,使用模擬地址
      // 生產環境應該要求用戶安裝錢包
      console.warn('No Sui wallet found, using simulated address for MVP');
      this.address = this.generateMockAddress() || '';
      this.connected = true;
      return this.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // 如果連接失敗,降級到模擬模式
      console.warn('Falling back to simulated wallet');
      this.address = this.generateMockAddress() || '';
      this.connected = true;
      return this.address;
    }
  }

  /**
   * 斷開錢包連接
   */
  disconnect(): void {
    this.address = null;
    this.connected = false;
  }

  /**
   * 簽名訊息
   */
  async signMessage(message: string): Promise<{ signature: string; publicKey: string }> {
    if (!this.connected || !this.address) {
      throw new Error('錢包未連接');
    }

    try {
      // 如果有 Sui 錢包,使用真實簽名
      if (hasSuiWallet()) {
        console.log('Attempting to sign message with real wallet...');

        // 方法 1: 嘗試 Wallet Standard API (Slush, 現代錢包)
        const walletStandardWallets = getWalletStandardWallets();
        if (walletStandardWallets.length > 0) {
          try {
            const wallet = walletStandardWallets[0];
            const messageBytes = new TextEncoder().encode(message);

            const signFeature = wallet.features['sui:signPersonalMessage'] ||
                               wallet.features['standard:signPersonalMessage'];

            if (signFeature && signFeature.signPersonalMessage) {
              const result = await signFeature.signPersonalMessage({
                message: messageBytes,
                account: { address: this.address },
              });

              console.log('Signature result (Wallet Standard):', result);

              return {
                signature: result.signature,
                publicKey: result.signature || '',
              };
            }
          } catch (err) {
            console.warn('Wallet Standard signing failed, trying other methods...', err);
          }
        }

        // 方法 2: 嘗試標準 Wallet API
        if ('suiWallet' in window) {
          const wallet = (window as any).suiWallet;
          const messageBytes = new TextEncoder().encode(message);

          const result = await wallet.signPersonalMessage({
            message: messageBytes,
            account: { address: this.address },
          });

          console.log('Signature result:', result);

          return {
            signature: result.signature,
            publicKey: result.signature || '', // 某些錢包可能不返回 publicKey
          };
        }

        // 方法 3: 嘗試舊版 API
        if ('sui' in window) {
          const wallet = (window as any).sui;
          const result = await wallet.signMessage({
            message: new TextEncoder().encode(message),
          });

          return {
            signature: result.signature,
            publicKey: result.publicKey || '',
          };
        }
      }

      // MVP 階段:模擬簽名
      console.warn('Using simulated signature for MVP');
      return {
        signature: this.generateMockSignature(message),
        publicKey: this.generateMockPublicKey(),
      };
    } catch (error) {
      console.error('Failed to sign message:', error);
      // 降級到模擬簽名
      console.warn('Falling back to simulated signature');
      return {
        signature: this.generateMockSignature(message),
        publicKey: this.generateMockPublicKey(),
      };
    }
  }

  /**
   * 生成模擬地址 (僅用於 MVP 測試)
   */
  private generateMockAddress(): string {
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `0x${randomHex}`;
  }

  /**
   * 生成模擬簽名 (僅用於 MVP 測試)
   */
  private generateMockSignature(message: string): string {
    // 簡單的 base64 編碼作為模擬簽名
    return btoa(`mock_signature_${message}_${Date.now()}`);
  }

  /**
   * 生成模擬公鑰 (僅用於 MVP 測試)
   */
  private generateMockPublicKey(): string {
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return randomHex;
  }
}

// 導出單例
export const walletAdapter = new SimplifiedWalletAdapter();

/**
 * 格式化錢包地址 (縮短顯示)
 */
export const formatAddress = (address: string, prefixLen = 6, suffixLen = 4): string => {
  if (!address || address.length < prefixLen + suffixLen) {
    return address;
  }

  const prefix = address.slice(0, prefixLen);
  const suffix = address.slice(-suffixLen);
  return `${prefix}...${suffix}`;
};

/**
 * 複製文字到剪貼簿
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
