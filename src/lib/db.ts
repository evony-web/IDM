import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client singleton — SQLite for development.
 */

function createPrismaClient(): PrismaClient {
  console.log('[DB] Creating SQLite Prisma client');

  return new PrismaClient({
    log: ['error', 'warn'],
  });
}

// Create singleton
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  prisma = globalForPrisma.prisma;
}

export const db = prisma;
