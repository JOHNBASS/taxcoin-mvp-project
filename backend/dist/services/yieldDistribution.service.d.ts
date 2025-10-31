export declare const calculateCurrentYield: (investmentId: string) => Promise<number>;
export declare const distributePoolYield: (poolId: string) => Promise<{
    poolId: string;
    poolName: string;
    totalDistributed: number;
    investorCount: number;
}>;
export declare const distributeAllYields: () => Promise<{
    totalPools: number;
    totalDistributed: number;
    totalInvestors: number;
    results: {
        poolId: string;
        poolName: string;
        totalDistributed: number;
        investorCount: number;
    }[];
    distributedAt: Date;
}>;
export declare const settleMaturedInvestment: (investmentId: string) => Promise<{
    investmentId: string;
    poolName: string;
    investmentAmount: number;
    finalYield: number;
    totalAmount: number;
    settledAt: Date;
}>;
export declare const settleAllMaturedInvestments: () => Promise<{
    totalInvestments: number;
    totalSettled: number;
    totalYield: number;
    results: {
        investmentId: string;
        poolName: string;
        investmentAmount: number;
        finalYield: number;
        totalAmount: number;
        settledAt: Date;
    }[];
    settledAt: Date;
}>;
export declare const getYieldDistributionHistory: (poolId: string, limit?: number) => Promise<{
    details: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    createdAt: Date;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    changes: import("@prisma/client/runtime/library").JsonValue | null;
    ipAddress: string | null;
    userAgent: string | null;
}[]>;
//# sourceMappingURL=yieldDistribution.service.d.ts.map