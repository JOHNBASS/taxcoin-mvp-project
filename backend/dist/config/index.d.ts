export declare const config: {
    nodeEnv: "development" | "production" | "test";
    port: number;
    databaseUrl: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    gemini: {
        apiKey: string | undefined;
    };
    sui: {
        network: "testnet" | "devnet" | "mainnet";
        privateKey: string | undefined;
        taxCoinPackageId: string | undefined;
        rwaPoolPackageId: string | undefined;
    };
    corsOrigin: string;
    upload: {
        maxFileSize: number;
        uploadDir: string;
    };
};
export type Config = typeof config;
//# sourceMappingURL=index.d.ts.map