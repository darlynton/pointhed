import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const now = new Date();

  const pairs = [
    { from: 'NGN', to: 'GBP', rate: '0.0017', provider: 'manual' },
    { from: 'GBP', to: 'NGN', rate: '588.2352941176471', provider: 'manual' },
    { from: 'USD', to: 'GBP', rate: '0.79', provider: 'manual' },
    { from: 'GBP', to: 'USD', rate: '1.26582', provider: 'manual' },
  ];

  for (const p of pairs) {
    // Upsert to avoid duplicates
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: p.from,
        toCurrency: p.to,
        rate: p.rate,
        retrievedAt: now,
        provider: p.provider,
      },
    });
    console.log(`Inserted rate ${p.from}->${p.to} = ${p.rate}`);
  }

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
