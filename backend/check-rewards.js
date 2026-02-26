import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkRewards() {
  try {
    // Find Joe's Coffee House tenant
    const tenant = await prisma.tenant.findUnique({
      where: { vendorCode: '8QDERH' }
    });
    
    if (!tenant) {
      console.error('Tenant not found');
      process.exit(1);
    }

    console.log('Tenant:', tenant.businessName, 'ID:', tenant.id);
    
    // Find rewards for this tenant
    const rewards = await prisma.reward.findMany({
      where: {
        tenantId: tenant.id,
        deletedAt: null,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\nTotal active rewards:', rewards.length);
    if (rewards.length === 0) {
      console.log('❌ No rewards found for this tenant');
      process.exit(1);
    }

    rewards.forEach((r, i) => {
      console.log(`\n${i + 1}. ${r.name}`);
      console.log(`   Points: ${r.pointsRequired ?? r.points_required}`);
      console.log(`   Value: ${r.monetaryValueNgn ?? r.monetary_value_ngn}`);
      console.log(`   Stock: ${r.stockQuantity ?? r.stock_quantity}`);
      console.log(`   Description: ${r.description || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRewards();
