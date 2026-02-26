import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create subscription plans
  console.log('Creating subscription plans...');
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for small businesses',
      priceNgn: 500000, // NGN 5,000/month
      billingPeriod: 'monthly',
      features: {
        max_customers: 500,
        broadcasts_per_month: 10,
        support: 'email'
      }
    }
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Professional',
      slug: 'pro',
      description: 'For growing businesses',
      priceNgn: 1500000, // NGN 15,000/month
      billingPeriod: 'monthly',
      features: {
        max_customers: 2000,
        broadcasts_per_month: 50,
        support: 'priority'
      }
    }
  });

  // 2. Create platform admin
  console.log('Creating platform admin...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.platformAdmin.upsert({
    where: { email: 'admin@loyaltylaas.com' },
    update: {},
    create: {
      email: 'admin@loyaltylaas.com',
      passwordHash: adminPassword,
      fullName: 'Platform Admin',
      role: 'super_admin'
    }
  });

  // 3. Create sample tenants
  console.log('Creating sample tenants...');
  
  // Tenant 1: Coffee Shop
  const coffeeShop = await prisma.tenant.upsert({
    where: { slug: 'joes-coffee' },
    update: {},
    create: {
      businessName: "Joe's Coffee House",
      slug: 'joes-coffee',
      vendorCode: nanoid(),
      phoneNumber: '+2348012345001',
      email: 'joe@coffeehouse.com',
      subscriptionPlanId: starterPlan.id,
      subscriptionStatus: 'active',
      subscriptionStartsAt: new Date(),
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      onboardingCompleted: true,
      settings: {
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        points_per_naira: 1,
        welcomeBonusEnabled: true,
        welcomeBonusPoints: 100
      },
      branding: {
        primaryColor: '#6F4E37',
        logoUrl: ''
      }
    }
  });

  // Tenant 2: Boutique
  const boutique = await prisma.tenant.upsert({
    where: { slug: 'fashion-boutique' },
    update: {},
    create: {
      businessName: "Sarah's Fashion Boutique",
      slug: 'fashion-boutique',
      vendorCode: nanoid(),
      phoneNumber: '+2348012345002',
      email: 'sarah@fashionboutique.com',
      subscriptionPlanId: proPlan.id,
      subscriptionStatus: 'active',
      subscriptionStartsAt: new Date(),
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      onboardingCompleted: true,
      settings: {
        currency: 'NGN',
        timezone: 'Africa/Lagos',
        points_per_naira: 2,
        welcomeBonusEnabled: true,
        welcomeBonusPoints: 200
      }
    }
  });

  // 4. Create vendor users
  console.log('Creating vendor users...');
  const userPassword = await bcrypt.hash('password123', 10);

  const joeOwner = await prisma.vendorUser.create({
    data: {
      tenantId: coffeeShop.id,
      email: 'joe@coffeehouse.com',
      passwordHash: userPassword,
      fullName: 'Joe Smith',
      role: 'owner',
      phoneNumber: '+2348012345001'
    }
  });

  const sarahOwner = await prisma.vendorUser.create({
    data: {
      tenantId: boutique.id,
      email: 'sarah@fashionboutique.com',
      passwordHash: userPassword,
      fullName: 'Sarah Johnson',
      role: 'owner',
      phoneNumber: '+2348012345002'
    }
  });

  // 5. Create sample customers for Coffee Shop
  console.log('Creating sample customers...');
  
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: coffeeShop.id,
      phoneNumber: '+2348087654321',
      firstName: 'Alice',
      lastName: 'Williams',
      whatsappName: 'Alice W.',
      email: 'alice@example.com',
      totalPurchases: 5,
      totalSpentNgn: 2500000, // NGN 25,000
      lastPurchaseAt: new Date()
    }
  });

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: coffeeShop.id,
      phoneNumber: '+2348087654322',
      firstName: 'Bob',
      lastName: 'Brown',
      whatsappName: 'Bob B.',
      totalPurchases: 3,
      totalSpentNgn: 1500000 // NGN 15,000
    }
  });

  const customer3 = await prisma.customer.create({
    data: {
      tenantId: boutique.id,
      phoneNumber: '+2348087654323',
      firstName: 'Carol',
      lastName: 'Davis',
      whatsappName: 'Carol D.',
      totalPurchases: 8,
      totalSpentNgn: 5000000 // NGN 50,000
    }
  });

  // 6. Create points balances
  console.log('Creating points balances...');
  await prisma.customerPointsBalance.create({
    data: {
      tenantId: coffeeShop.id,
      customerId: customer1.id,
      totalPointsEarned: 2500,
      totalPointsRedeemed: 500,
      currentBalance: 2000,
      lastEarnedAt: new Date()
    }
  });

  await prisma.customerPointsBalance.create({
    data: {
      tenantId: coffeeShop.id,
      customerId: customer2.id,
      totalPointsEarned: 1500,
      currentBalance: 1500,
      lastEarnedAt: new Date()
    }
  });

  await prisma.customerPointsBalance.create({
    data: {
      tenantId: boutique.id,
      customerId: customer3.id,
      totalPointsEarned: 10000,
      totalPointsRedeemed: 2000,
      currentBalance: 8000,
      lastEarnedAt: new Date()
    }
  });

  // 7. Create sample rewards for Coffee Shop
  console.log('Creating sample rewards...');
  await prisma.reward.create({
    data: {
      tenantId: coffeeShop.id,
      name: 'Free Cappuccino',
      description: 'Redeem for one free cappuccino of any size',
      pointsRequired: 500,
      monetaryValueNgn: 150000, // NGN 1,500
      category: 'product',
      isActive: true
    }
  });

  await prisma.reward.create({
    data: {
      tenantId: coffeeShop.id,
      name: '20% Off Next Purchase',
      description: 'Get 20% discount on your next purchase',
      pointsRequired: 1000,
      category: 'discount',
      isActive: true
    }
  });

  await prisma.reward.create({
    data: {
      tenantId: boutique.id,
      name: 'N5,000 Gift Voucher',
      description: 'Redeem for NGN 5,000 off any purchase',
      pointsRequired: 5000,
      monetaryValueNgn: 500000,
      category: 'discount',
      isActive: true
    }
  });

  console.log('✅ Seeding completed!');
  console.log('\n📝 Login credentials:');
  console.log('Platform Admin:');
  console.log('  Email: admin@loyaltylaas.com');
  console.log('  Password: admin123');
  console.log('\nVendor Users:');
  console.log('  Joe (Coffee Shop):');
  console.log('    Email: joe@coffeehouse.com');
  console.log('    Password: password123');
  console.log('  Sarah (Boutique):');
  console.log('    Email: sarah@fashionboutique.com');
  console.log('    Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
