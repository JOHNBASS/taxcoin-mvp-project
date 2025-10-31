export declare const calculateFillRate: (currentAmount: number, targetAmount: number) => number;
export declare const calculateTokenAmount: (investmentAmount: number, totalSupply: number, targetAmount: number) => number;
export declare const calculateExpectedYield: (investmentAmount: number, yieldRate: number, daysToMaturity: number) => number;
export declare const checkPoolAvailability: (poolId: string) => Promise<{
    available: boolean;
    reason?: string;
}>;
export declare const updatePoolStatus: (poolId: string) => Promise<void>;
export declare const addTaxClaimToPool: (poolId: string, taxClaimId: string) => Promise<void>;
export declare const calculatePoolValue: (poolId: string) => Promise<number>;
export declare const calculateDaysToMaturity: (maturityDate: Date) => number;
export declare const validateInvestmentAmount: (amount: number, poolId: string) => Promise<{
    valid: boolean;
    reason?: string;
}>;
//# sourceMappingURL=rwaPool.service.d.ts.map