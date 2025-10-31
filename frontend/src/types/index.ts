// ============================================
// 使用者與認證
// ============================================

export enum UserRole {
  TOURIST = 'TOURIST',
  INVESTOR = 'INVESTOR',
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
}

export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED', // 向後兼容
}

export interface DIDDocument {
  '@context': string | string[];
  id: string;
  verificationMethod?: any[];
  authentication?: string[];
  assertionMethod?: string[];
  [key: string]: any;
}

export interface User {
  id: string;
  did: string; // W3C DID 格式 (did:key:z6Mk...)
  didDocument?: DIDDocument; // DID Document
  role: UserRole;
  kycStatus: KycStatus;
  walletAddress?: string;
  email?: string;
  nationality?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  walletAddress: string;
  signature: string;
  publicKey: string;
  message: string;
  nonce: string;
}

export interface RegisterRequest {
  walletAddress: string;
  role: UserRole;
  email?: string;
}

// ============================================
// 退稅申請
// ============================================

export enum TaxClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OcrResult {
  merchantName?: string;
  purchaseDate?: string;
  totalAmount?: number;
  items?: ReceiptItem[];
  confidence?: number;
  rawText?: string;
}

export interface TaxClaim {
  id: string;
  userId: string;
  receiptImages: string[];
  ocrResult?: OcrResult;
  totalAmount: number;
  taxAmount: number;
  status: TaxClaimStatus;
  reviewNotes?: string;
  nftTokenId?: string;
  txHash?: string;
  entryFlight?: string;
  entryFlightDate?: string | Date;
  exitFlight?: string;
  exitFlightDate?: string | Date;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaxClaimRequest {
  receipts: File[];
}

export interface TaxClaimListResponse {
  data: TaxClaim[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// KYC 驗證
// ============================================

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  credentialSubject: {
    id: string;
    fullName: string;
    passportNumber: string;
    nationality: string;
    dateOfBirth: string;
    kycLevel: string;
  };
  proof?: any;
}

export interface KycRecord {
  id: string;
  userId: string;
  fullName: string;
  passportNumber: string;
  passportImageUrl: string;
  faceImageUrl: string;
  nationality?: string;
  passportCountry?: string; // 向後兼容
  passportExpiry: string;
  dateOfBirth?: string;
  status: KycStatus;
  faceMatchScore?: number;
  ocrData?: any;
  verifiedAt?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectedReason?: string;
  failureReason?: string; // 向後兼容

  // Self SDK 相關欄位
  verifiableCredential?: VerifiableCredential; // 可驗證憑證
  credentialId?: string; // 憑證 ID
  issuerDID?: string; // 簽發者 DID
  didDocumentHash?: string; // DID Document Hash

  // Celo 鏈上驗證欄位
  celo?: {
    txHash: string; // Celo 交易哈希
    blockNumber: number; // Celo 區塊號
    proofHash: string; // Proof Hash (防止重放攻擊)
    verifiedAt: string; // Celo 鏈上驗證時間
    explorerUrl: string; // Celoscan 瀏覽器連結
  };

  createdAt: string;
  updatedAt: string;
}

export interface SubmitKycRequest {
  passport: File;
  selfie: File;
}

// ============================================
// RWA 投資池
// ============================================

export enum PoolStatus {
  RECRUITING = 'RECRUITING', // 募集中
  FULL = 'FULL', // 已滿額
  MATURED = 'MATURED', // 已到期
  SETTLED = 'SETTLED', // 已結算
  REDEEMED = 'REDEEMED', // 已兌現
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface AssetItem {
  claimId: string;
  amount: number;
  taxAmount: number;
}

export interface RwaPool {
  id: string;
  name: string;
  poolName?: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  totalValue: number;
  sharePrice: number;
  totalShares: number;
  availableShares: number;
  yieldRate: number;
  maturityDate: string;
  status: PoolStatus;
  riskLevel: RiskLevel;
  assets?: AssetItem[];
  investments?: Investment[];
  investorCount: number;
  poolContractId?: string;
  totalTokenSupply?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Investment {
  id: string;
  userId: string;
  poolId: string;
  shares: number;
  investmentAmount: number;
  expectedYield: number;
  yieldAmount?: number; // 實際收益金額
  status: 'ACTIVE' | 'REDEEMED' | 'CANCELLED';
  redeemedAt?: string; // 領取時間
  pool?: RwaPool;
  createdAt: string;
  updatedAt: string;
}

export interface InvestRequest {
  amount: number;
}

export interface PoolListResponse {
  data: RwaPool[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// 通知
// ============================================

export enum NotificationType {
  TAX_CLAIM_APPROVED = 'TAX_CLAIM_APPROVED',
  TAX_CLAIM_REJECTED = 'TAX_CLAIM_REJECTED',
  KYC_VERIFIED = 'KYC_VERIFIED',
  KYC_FAILED = 'KYC_FAILED',
  INVESTMENT_CONFIRMED = 'INVESTMENT_CONFIRMED',
  YIELD_DISTRIBUTED = 'YIELD_DISTRIBUTED',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// API 回應格式
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// Exchange 兑换相关
// ============================================

export interface LiquidityPool {
  id: string;
  suiReserve: number;
  taxcoinReserve: number;
  lpSupply: number;
  price: number; // TAXCOIN per SUI
  createdAt: string;
  updatedAt: string;
}

export interface LPToken {
  id: string;
  poolId: string;
  amount: number;
  provider: string;
  providedAt: string;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  priceImpact: number; // 百分比
  minimumReceived: number; // 考虑滑点后的最小接收量
  exchangeRate: number;
  fee: number;
}

export interface SwapRequest {
  inputToken: 'SUI' | 'TAXCOIN';
  outputToken: 'SUI' | 'TAXCOIN';
  inputAmount: number;
  minOutputAmount: number;
  slippageTolerance: number; // 百分比 (如 0.5 表示 0.5%)
}

export interface AddLiquidityRequest {
  suiAmount: number;
  taxcoinAmount: number;
  minLpTokens: number;
}

export interface RemoveLiquidityRequest {
  lpTokenId: string;
  lpAmount: number;
  minSui: number;
  minTaxcoin: number;
}

export interface PriceHistory {
  timestamp: string;
  price: number;
  suiReserve: number;
  taxcoinReserve: number;
  volume24h: number;
}

export interface ExchangeStats {
  totalValueLocked: number; // TVL in TWD
  volume24h: number;
  volume7d: number;
  currentPrice: number;
  priceChange24h: number;
  lpTokenHolders: number;
}

// ============================================
// 錢包相關
// ============================================

export interface WalletInfo {
  address: string;
  balance?: string;
  connected: boolean;
}

export interface SignMessageRequest {
  message: string;
  address: string;
}
