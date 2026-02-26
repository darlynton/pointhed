import dotenv from 'dotenv';
import prisma from '../src/utils/prisma.js';

dotenv.config();

async function seed(tenantId) {
  if (!tenantId) {
    console.error('Usage: node seedRewards.mjs <tenantId>');
    process.exit(1);
  }

  const rewards = [
    {
      name: 'Free Espresso Shot',
      description: 'Redeem for one free espresso shot at the counter.',
      pointsRequired: 50,
      monetaryValueNgn: 5000,
      stockQuantity: 100,
      imageUrl: 'https://images.unsplash.com/photo-1510627498534-cf7e9002facc?w=800&h=600&fit=crop',
      category: 'Beverages'
    },
    {
      name: '10% Off Next Purchase',
      description: 'Coupon for 10% off your next order.',
      pointsRequired: 200,
      monetaryValueNgn: 0,
      stockQuantity: null,
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&h=600&fit=crop',
      category: 'Discounts'
    },
    {
      name: 'Large Bag of Coffee Beans',
      description: '500g bag of our house blend.',
      pointsRequired: 1000,
      monetaryValueNgn: 75000,
      stockQuantity: 20,
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop',
      category: 'Merchandise'
    }
  ];

  try {
    for (const r of rewards) {
      const created = await prisma.reward.create({ data: { tenantId, ...r } });
      console.log('Created reward:', created.id, created.name);
    }
    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seed(process.argv[2]);
