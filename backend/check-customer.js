// Check customer WhatsApp opt-in status
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomers() {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        firstName: true,
        whatsappName: true,
        phoneNumber: true,
        optedIn: true,
        pointsBalance: {
          select: {
            currentBalance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log('\n📊 Recent Customers:\n');
    
    if (customers.length === 0) {
      console.log('No customers found.');
      return;
    }

    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.firstName || customer.whatsappName || 'Unknown'}`);
      console.log(`   ID: ${customer.id}`);
      console.log(`   Phone: ${customer.phoneNumber || 'NO PHONE'}`);
      console.log(`   Opted In: ${customer.optedIn ? '✅ YES' : '❌ NO'}`);
      console.log(`   Balance: ${customer.pointsBalance?.currentBalance || 0} points`);
      console.log('');
    });

    const optedOutCount = customers.filter(c => !c.optedIn).length;
    const noPhoneCount = customers.filter(c => !c.phoneNumber).length;

    if (optedOutCount > 0) {
      console.log(`⚠️  ${optedOutCount} customers are not opted in for WhatsApp notifications.`);
    }
    if (noPhoneCount > 0) {
      console.log(`⚠️  ${noPhoneCount} customers have no phone number.`);
    }

  } catch (error) {
    console.error('Error checking customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCustomers();
