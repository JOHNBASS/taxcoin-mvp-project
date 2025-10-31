/**
 * 收益分配服務單元測試
 */

import { prismaMock } from '@/__tests__/setup.js';
import {
  calculateCurrentYield,
  distributePoolYield,
  settleMaturedInvestment,
} from '../yieldDistribution.service.js';
import { NotFoundError, ValidationError } from '@/utils/errors.js';
import { ErrorCode } from '@/types/index.js';

describe('YieldDistribution Service', () => {
  describe('calculateCurrentYield', () => {
    it('should calculate yield for 30 days holding', async () => {
      const investmentId = 'inv-123';
      const investmentAmount = 10000; // $10,000
      const annualYieldRate = 8.0; // 8%
      const holdingDays = 30;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - holdingDays);

      prismaMock.investment.findUnique.mockResolvedValue({
        id: investmentId,
        userId: 'user-123',
        poolId: 'pool-123',
        amount: investmentAmount,
        shares: 100,
        status: 'ACTIVE',
        investedAt: thirtyDaysAgo,
        maturityDate: new Date('2025-12-31'),
        createdAt: thirtyDaysAgo,
        updatedAt: new Date(),
        pool: {
          id: 'pool-123',
          name: 'Test Pool',
          description: 'Test Description',
          imageUrl: 'test.jpg',
          propertyType: 'RESIDENTIAL',
          location: 'Test Location',
          totalValue: 1000000,
          tokenSupply: 10000,
          tokenPrice: 100,
          minimumInvestment: 1000,
          expectedYield: annualYieldRate,
          investmentPeriod: 12,
          status: 'ACTIVE',
          riskLevel: 'MEDIUM',
          currentInvestment: 500000,
          investorCount: 50,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      const yield_ = await calculateCurrentYield(investmentId);

      // Expected: 10000 * 0.08 * (30/365) = 65.75
      const expected = (investmentAmount * annualYieldRate * holdingDays) / 365 / 100;

      expect(yield_).toBeCloseTo(expected, 2);
      expect(yield_).toBeGreaterThan(0);
    });

    it('should calculate yield for 365 days holding (one year)', async () => {
      const investmentId = 'inv-123';
      const investmentAmount = 10000;
      const annualYieldRate = 10.0; // 10%

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      prismaMock.investment.findUnique.mockResolvedValue({
        id: investmentId,
        amount: investmentAmount,
        investedAt: oneYearAgo,
        pool: {
          expectedYield: annualYieldRate,
        },
      } as any);

      const yield_ = await calculateCurrentYield(investmentId);

      // Expected: 10000 * 0.10 = 1000
      expect(yield_).toBeCloseTo(1000, 2);
    });

    it('should return 0 for same day investment', async () => {
      const investmentId = 'inv-123';
      const today = new Date();

      prismaMock.investment.findUnique.mockResolvedValue({
        id: investmentId,
        amount: 10000,
        investedAt: today,
        pool: {
          expectedYield: 8.0,
        },
      } as any);

      const yield_ = await calculateCurrentYield(investmentId);

      expect(yield_).toBe(0);
    });

    it('should throw NotFoundError when investment not found', async () => {
      prismaMock.investment.findUnique.mockResolvedValue(null);

      await expect(calculateCurrentYield('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError for non-ACTIVE investment', async () => {
      prismaMock.investment.findUnique.mockResolvedValue({
        id: 'inv-123',
        status: 'MATURED',
        amount: 10000,
        investedAt: new Date(),
        pool: {
          expectedYield: 8.0,
        },
      } as any);

      await expect(calculateCurrentYield('inv-123')).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('distributePoolYield', () => {
    it('should distribute yield to all active investments in pool', async () => {
      const poolId = 'pool-123';
      const investments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          amount: 10000,
          investedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          status: 'ACTIVE',
          pool: { expectedYield: 8.0 },
        },
        {
          id: 'inv-2',
          userId: 'user-2',
          amount: 20000,
          investedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          status: 'ACTIVE',
          pool: { expectedYield: 8.0 },
        },
      ];

      prismaMock.investment.findMany.mockResolvedValue(investments as any);
      prismaMock.yieldDistribution.create.mockResolvedValue({} as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await distributePoolYield(poolId);

      // Should create 2 yield distributions
      expect(prismaMock.yieldDistribution.create).toHaveBeenCalledTimes(2);

      // Should update user balances
      expect(prismaMock.user.update).toHaveBeenCalledTimes(2);

      // Should create audit logs
      expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(2);
    });

    it('should skip investments with zero yield', async () => {
      const poolId = 'pool-123';
      const investments = [
        {
          id: 'inv-1',
          userId: 'user-1',
          amount: 10000,
          investedAt: new Date(), // Today - 0 days holding
          status: 'ACTIVE',
          pool: { expectedYield: 8.0 },
        },
      ];

      prismaMock.investment.findMany.mockResolvedValue(investments as any);

      await distributePoolYield(poolId);

      // Should not create distributions for zero yield
      expect(prismaMock.yieldDistribution.create).not.toHaveBeenCalled();
    });

    it('should handle pool with no investments', async () => {
      const poolId = 'pool-empty';

      prismaMock.investment.findMany.mockResolvedValue([]);

      await distributePoolYield(poolId);

      expect(prismaMock.yieldDistribution.create).not.toHaveBeenCalled();
    });
  });

  describe('settleMaturedInvestment', () => {
    it('should settle matured investment successfully', async () => {
      const investmentId = 'inv-123';
      const userId = 'user-123';
      const investmentAmount = 10000;
      const totalYield = 800; // 8% annual yield

      const investment = {
        id: investmentId,
        userId,
        poolId: 'pool-123',
        amount: investmentAmount,
        status: 'ACTIVE',
        maturityDate: new Date(Date.now() - 1000), // Already matured
        investedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        pool: {
          expectedYield: 8.0,
        },
      };

      prismaMock.investment.findUnique.mockResolvedValue(investment as any);
      prismaMock.yieldDistribution.aggregate.mockResolvedValue({
        _sum: { amount: totalYield },
      } as any);
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return await callback(prismaMock);
      });
      prismaMock.investment.update.mockResolvedValue({} as any);
      prismaMock.user.update.mockResolvedValue({} as any);
      prismaMock.notification.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await settleMaturedInvestment(investmentId);

      // Should update investment status to MATURED
      expect(prismaMock.investment.update).toHaveBeenCalledWith({
        where: { id: investmentId },
        data: expect.objectContaining({
          status: 'MATURED',
        }),
      });

      // Should return principal + yield to user
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          balance: {
            increment: investmentAmount, // Principal returned
          },
        },
      });

      // Should create notification
      expect(prismaMock.notification.create).toHaveBeenCalled();

      // Should create audit log
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundError when investment not found', async () => {
      prismaMock.investment.findUnique.mockResolvedValue(null);

      await expect(settleMaturedInvestment('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError when investment not matured yet', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      prismaMock.investment.findUnique.mockResolvedValue({
        id: 'inv-123',
        status: 'ACTIVE',
        maturityDate: futureDate, // Not matured yet
      } as any);

      await expect(settleMaturedInvestment('inv-123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when investment already settled', async () => {
      prismaMock.investment.findUnique.mockResolvedValue({
        id: 'inv-123',
        status: 'MATURED', // Already settled
        maturityDate: new Date(),
      } as any);

      await expect(settleMaturedInvestment('inv-123')).rejects.toThrow(
        ValidationError
      );
    });
  });
});
