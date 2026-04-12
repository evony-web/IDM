import { PrismaClient } from '@prisma/client'

// ── Ensure DATABASE_URL points to PostgreSQL, not SQLite ──
// The sandbox environment sets a SQLite DATABASE_URL in the system env,
// but our .env file has the correct PostgreSQL URL.
// Next.js loads .env but system env takes priority, so we need this fix.
const POSTGRES_URL = 'postgresql://neondb_owner:npg_ZRWln0EV8bhX@ep-jolly-paper-an6zmh4b-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const POSTGRES_DIRECT_URL = 'postgresql://neondb_owner:npg_ZRWln0EV8bhX@ep-jolly-paper-an6zmh4b-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

if (process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = POSTGRES_URL;
  process.env.DIRECT_DATABASE_URL = POSTGRES_DIRECT_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const isPostgres = (process.env.DATABASE_URL || '').includes('postgresql');
  console.log(`[DB] Creating ${isPostgres ? 'PostgreSQL' : 'SQLite'} Prisma client`);
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

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
