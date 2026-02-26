import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
  console.error('Usage: node remove-from-waitlist.js <email>');
  process.exit(1);
}

async function removeEmail() {
  try {
    const deleted = await prisma.waitlist.delete({
      where: { email }
    });
    console.log(`✅ Removed ${email} from waitlist`);
    console.log('   Joined at:', deleted.createdAt);
  } catch (error) {
    if (error.code === 'P2025') {
      console.log(`❌ ${email} not found in waitlist`);
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

removeEmail().catch(console.error);
