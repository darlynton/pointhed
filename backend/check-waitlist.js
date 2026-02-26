import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWaitlist() {
  const entries = await prisma.waitlist.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      email: true,
      source: true,
      createdAt: true
    }
  });

  console.log('\n📋 Recent Waitlist Entries:\n');
  console.table(entries);
  
  const darlynton = await prisma.waitlist.findUnique({
    where: { email: 'darlynton03@gmail.com' }
  });
  
  if (darlynton) {
    console.log('\n✅ darlynton03@gmail.com is in the waitlist');
    console.log('   Joined at:', darlynton.createdAt);
    console.log('   Source:', darlynton.source);
  }
  
  await prisma.$disconnect();
}

checkWaitlist().catch(console.error);
