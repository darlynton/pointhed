// Check tenant welcome bonus settings
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenantSettings() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        businessName: true,
        settings: true
      }
    });

    console.log('\n📊 Tenant Settings:\n');
    
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.businessName}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Welcome Bonus Enabled: ${tenant.settings?.welcomeBonusEnabled ? '✅ YES' : '❌ NO'}`);
      console.log(`   Welcome Bonus Points: ${tenant.settings?.welcomeBonusPoints || 0}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error checking tenant settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTenantSettings();
