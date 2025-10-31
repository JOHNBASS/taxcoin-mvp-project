import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
dotenvConfig();
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3000'),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),
    GEMINI_API_KEY: z.string().optional(),
    SUI_NETWORK: z.enum(['testnet', 'devnet', 'mainnet']).default('testnet'),
    SUI_PRIVATE_KEY: z.string().optional(),
    SUI_TAXCOIN_PACKAGE_ID: z.string().optional(),
    SUI_RWA_POOL_PACKAGE_ID: z.string().optional(),
    CORS_ORIGIN: z.string().default('http://localhost:5004'),
    MAX_FILE_SIZE: z.string().default('5242880'),
    UPLOAD_DIR: z.string().default('./uploads'),
});
const parseResult = envSchema.safeParse(process.env);
if (!parseResult.success) {
    console.error('❌ 環境變數驗證失敗:');
    console.error(parseResult.error.format());
    process.exit(1);
}
export const config = {
    nodeEnv: parseResult.data.NODE_ENV,
    port: parseInt(parseResult.data.PORT, 10),
    databaseUrl: parseResult.data.DATABASE_URL,
    jwt: {
        secret: parseResult.data.JWT_SECRET,
        expiresIn: parseResult.data.JWT_EXPIRES_IN,
    },
    gemini: {
        apiKey: parseResult.data.GEMINI_API_KEY,
    },
    sui: {
        network: parseResult.data.SUI_NETWORK,
        privateKey: parseResult.data.SUI_PRIVATE_KEY,
        taxCoinPackageId: parseResult.data.SUI_TAXCOIN_PACKAGE_ID,
        rwaPoolPackageId: parseResult.data.SUI_RWA_POOL_PACKAGE_ID,
    },
    corsOrigin: parseResult.data.CORS_ORIGIN,
    upload: {
        maxFileSize: parseInt(parseResult.data.MAX_FILE_SIZE, 10),
        uploadDir: parseResult.data.UPLOAD_DIR,
    },
};
//# sourceMappingURL=index.js.map