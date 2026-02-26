import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWhatsAppLeads() {
  const leads = await prisma.whatsAppLead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      phoneNumber: true,
      countryCode: true,
      source: true,
      status: true,
      createdAt: true
    }
  });

  console.log('\n📱 Recent WhatsApp Instant Demo Requests:\n');
  
  if (leads.length === 0) {
    console.log('No WhatsApp leads yet.');
  } else {
    console.table(leads);
    console.log(`\n✅ Total leads shown: ${leads.length}`);
  }
  
  const total = await prisma.whatsAppLead.count();
  console.log(`📊 Total WhatsApp leads in database: ${total}\n`);
  
  await prisma.$disconnect();
}

checkWhatsAppLeads().catch(console.error);
