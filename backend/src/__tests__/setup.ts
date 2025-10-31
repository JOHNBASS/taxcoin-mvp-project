/**
 * Jest 測試環境設置
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock Prisma Client
jest.mock('@/utils/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

// Mock Logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

beforeEach(() => {
  // Reset all mocks before each test
  mockReset(prisma);
});

// Export mocked Prisma for use in tests
import { prisma } from '@/utils/prisma.js';

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
