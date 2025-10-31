import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// 載入環境變數
dotenvConfig();

// 環境變數 Schema 驗證
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Gemini AI
  GEMINI_API_KEY: z.string().optional(),

  // Sui Blockchain
  SUI_NETWORK: z.enum(['testnet', 'devnet', 'mainnet']).default('testnet'),
  SUI_PRIVATE_KEY: z.string().optional(),
  SUI_TAXCOIN_PACKAGE_ID: z.string().optional(),
  SUI_RWA_POOL_PACKAGE_ID: z.string().optional(),
  SUI_RWA_POOL_ADMIN_CAP: z.string().optional(),
  SUI_NFT_ADMIN_CAP: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5004'),

  // File Upload
  MAX_FILE_SIZE: z.string().default('5242880'), // 5MB
  UPLOAD_DIR: z.string().default('./uploads'),
});

// 驗證環境變數
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ 環境變數驗證失敗:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const config = {
  // Server
  nodeEnv: parseResult.data.NODE_ENV,
  port: parseInt(parseResult.data.PORT, 10),

  // Database
  databaseUrl: parseResult.data.DATABASE_URL,

  // JWT
  jwt: {
    secret: parseResult.data.JWT_SECRET,
    expiresIn: parseResult.data.JWT_EXPIRES_IN,
  },

  // Gemini AI
  gemini: {
    apiKey: parseResult.data.GEMINI_API_KEY,
  },

  // Sui Blockchain
  sui: {
    network: parseResult.data.SUI_NETWORK,
    privateKey: parseResult.data.SUI_PRIVATE_KEY,
    taxCoinPackageId: parseResult.data.SUI_TAXCOIN_PACKAGE_ID,
    rwaPoolPackageId: parseResult.data.SUI_RWA_POOL_PACKAGE_ID,
    adminCapId: parseResult.data.SUI_RWA_POOL_ADMIN_CAP,
    nftAdminCapId: parseResult.data.SUI_NFT_ADMIN_CAP,
  },

  // CORS
  corsOrigin: parseResult.data.CORS_ORIGIN,

  // File Upload
  upload: {
    maxFileSize: parseInt(parseResult.data.MAX_FILE_SIZE, 10),
    uploadDir: parseResult.data.UPLOAD_DIR,
  },
};

export type Config = typeof config;
