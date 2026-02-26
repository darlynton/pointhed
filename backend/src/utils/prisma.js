import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown handlers
async function gracefulShutdown(signal) {
  console.log(`\n📴 Received ${signal}. Closing database connections...`);
  await prisma.$disconnect();
  console.log('✅ Database connections closed.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
