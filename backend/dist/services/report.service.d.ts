export declare const generatePoolReport: (poolId?: string, startDate?: Date, endDate?: Date) => Promise<{
    reportType: string;
    generatedAt: Date;
    period: {
        startDate: Date | undefined;
        endDate: Date | undefined;
    };
    summary: {
        totalPools: number;
        totalTargetAmount: number;
        totalCurrentAmount: number;
        totalInvestments: number;
    };
    data: {
        pool: {
            id: string;
            name: string;
            description: string | null;
            targetAmount: number;
            currentAmount: number;
            fillRate: string;
            yieldRate: number;
            status: import(".prisma/client").$Enums.PoolStatus;
            maturityDate: Date;
            riskLevel: import(".prisma/client").$Enums.RiskLevel;
            createdAt: Date;
        };
        assets: {
            taxClaimId: string;
            addedAt: Date;
        }[];
        investments: {
            total: number;
            active: number;
            settled: number;
            totalInvested: number;
            totalYield: number;
            averageInvestment: number;
        };
        investors: {
            userId: string;
            email: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            investmentAmount: number;
            tokenAmount: number;
            yieldAmount: number | null;
            yieldRate: number | null;
            status: import(".prisma/client").$Enums.InvestmentStatus;
            investedAt: Date;
            redeemedAt: Date | null;
        }[];
    }[];
}>;
export declare const generateTaxClaimReport: (startDate: Date, endDate: Date, status?: string) => Promise<{
    reportType: string;
    generatedAt: Date;
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        totalOriginalAmount: number;
        totalTaxAmount: number;
        totalTaxCoinAmount: number;
        approvalRate: string | number;
    };
    data: {
        id: string;
        user: {
            id: string;
            email: string | null;
            role: import(".prisma/client").$Enums.UserRole;
            kycStatus: import(".prisma/client").$Enums.KycStatus;
        };
        merchantName: string | null;
        purchaseDate: string | null;
        originalAmount: number;
        taxAmount: number;
        taxCoinAmount: number;
        status: import(".prisma/client").$Enums.ClaimStatus;
        receiptImageUrl: string | null;
        ocrData: import("@prisma/client/runtime/library").JsonValue;
        reviewedAt: Date | null;
        rejectedReason: string | null;
        createdAt: Date;
    }[];
}>;
export declare const generateUserReport: (role?: string, kycStatus?: string) => Promise<{
    reportType: string;
    generatedAt: Date;
    summary: {
        total: number;
        byRole: {
            tourist: number;
            investor: number;
            admin: number;
        };
        byKycStatus: {
            verified: number;
            pending: number;
            rejected: number;
        };
        totalTaxClaims: number;
        totalInvestments: number;
    };
    data: {
        id: string;
        did: string;
        walletAddress: string | null;
        email: string | null;
        phoneNumber: string | null;
        role: import(".prisma/client").$Enums.UserRole;
        kycStatus: import(".prisma/client").$Enums.KycStatus;
        taxClaims: {
            total: number;
            approved: number;
            totalTaxAmount: number;
        };
        investments: {
            total: number;
            active: number;
            totalInvested: number;
            totalYield: number;
        };
        createdAt: Date;
        lastLoginAt: Date | null;
    }[];
}>;
export declare const generateYieldDistributionReport: (startDate: Date, endDate: Date) => Promise<{
    reportType: string;
    generatedAt: Date;
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: {
        totalDistributions: number;
        totalDistributed: number;
        totalInvestors: number;
        averagePerDistribution: number;
    };
    data: {
        id: string;
        poolId: string;
        totalDistributed: any;
        investorCount: any;
        distributedAt: Date;
    }[];
}>;
export declare const generateFinancialReport: (startDate: Date, endDate: Date) => Promise<{
    reportType: string;
    generatedAt: Date;
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: {
        taxRefund: {
            totalClaims: number;
            totalAmount: number;
            totalTaxCoinIssued: number;
        };
        investment: {
            totalInvestments: number;
            totalInvested: number;
            totalYieldDistributed: number;
            netFlow: number;
        };
        overall: {
            totalRevenue: number;
            totalExpense: number;
            netProfit: number;
        };
    };
}>;
//# sourceMappingURL=report.service.d.ts.map