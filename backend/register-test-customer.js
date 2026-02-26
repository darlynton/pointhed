import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function registerTestCustomer() {
  try {
    // Find Joe's Coffee House tenant
    const tenant = await prisma.tenant.findUnique({
      where: { vendorCode: '8QDERH' }
    });
    
    if (!tenant) {
      console.error('Tenant not found');
      return;
    }

    // Check if customer already exists
    const existing = await prisma.customer.findFirst({
      where: {
        phoneNumber: '+447404938935',
        tenantId: tenant.id
      }
    });

    if (existing) {
      console.log('✅ Customer already registered');
      console.log('ID:', existing.id);
      const balance = await prisma.pointsBalance.findUnique({
        where: { customerId: existing.id }
      });
      console.log('Points:', balance?.balance || 0);
      return;
    }

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: '+447404938935',
        firstName: 'Test',
        lastName: 'Customer',
        whatsappName: 'Test Customer',
        loyaltyStatus: 'active'
      }
    });

    // Create points balance
    const pointsBalance = await prisma.pointsBalance.create({
      data: {
        customerId: customer.id,
        balance: tenant.welcomeBonusEnabled ? tenant.welcomeBonusPoints : 0
      }
    });

    // Create welcome bonus transaction if enabled
    if (tenant.welcomeBonusEnabled) {
      await prisma.pointsTransaction.create({
        data: {
          customerId: customer.id,
          type: 'earned',
          amount: tenant.welcomeBonusPoints,
          description: 'Welcome bonus',
          metadata: { source: 'welcome_bonus' }
        }
      });
    }

    console.log('✅ Customer registered successfully');
    console.log('ID:', customer.id);
    console.log('Points:', pointsBalance.balance);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

registerTestCustomer();
