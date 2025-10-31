import { mockDeep, mockReset } from 'jest-mock-extended';
jest.mock('@/utils/prisma', () => ({
    __esModule: true,
    prisma: mockDeep(),
}));
jest.mock('@/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));
beforeEach(() => {
    mockReset(prisma);
});
import { prisma } from '../utils/prisma.js';
export const prismaMock = prisma;
//# sourceMappingURL=setup.js.map