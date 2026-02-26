import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [,, phoneArg, vendorCodeArg] = process.argv;
  if (!phoneArg || !vendorCodeArg) {
    console.log('Usage: node scripts/seedTestCustomer.mjs <phone> <vendorCode>');
    process.exit(1);
  }
  const phone = phoneArg.startsWith('+') ? phoneArg : '+' + phoneArg;
  const vendorCode = vendorCodeArg.trim();

  const tenant = await prisma.tenant.findUnique({ where: { vendorCode }, select: { id: true, businessName: true } });
  if (!tenant) {
    console.log(`No tenant with vendorCode ${vendorCode}`);
    process.exit(1);
  }

  const variants = [phone, phone.replace(/^\+/, ''), '+' + phone.replace(/^\+/, '')];
  let customer = await prisma.customer.findFirst({ where: { phoneNumber: { in: variants }, tenantId: tenant.id, deletedAt: null } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: phone,
        firstName: 'Test',
        lastName: 'User',
        optedIn: true,
        optedInAt: new Date(),
        conversationState: { activeVendor: true }
      }
    });
    console.log('Created customer', customer.id);
  } else {
    console.log('Found existing customer', customer.id);
    await prisma.customer.update({ where: { id: customer.id }, data: { optedIn: true, optedInAt: new Date(), conversationState: { activeVendor: true } } });
  }

  await prisma.customerPointsBalance.upsert({
    where: { tenantId_customerId: { tenantId: tenant.id, customerId: customer.id } },
    update: {},
    create: { tenantId: tenant.id, customerId: customer.id, currentBalance: 100, totalPointsEarned: 100, totalPointsRedeemed: 0 }
  });

  console.log(`Seeded customer for ${tenant.businessName} -> ${customer.id} (${phone})`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
