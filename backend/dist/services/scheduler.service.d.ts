export declare const startScheduler: () => void;
export declare const stopScheduler: () => void;
export declare const triggerYieldDistribution: () => Promise<{
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
export declare const triggerInvestmentSettlement: () => Promise<{
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
export declare const getSchedulerStatus: () => {
    yieldDistribution: {
        name: string;
        schedule: string;
        cronExpression: string;
        running: boolean;
    };
    investmentSettlement: {
        name: string;
        schedule: string;
        cronExpression: string;
        running: boolean;
    };
};
//# sourceMappingURL=scheduler.service.d.ts.map