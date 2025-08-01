import { PrismaClient } from '@prisma/client';

// Database connection validation
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  errorFormat: 'pretty',
});

// Test database connection on startup
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;