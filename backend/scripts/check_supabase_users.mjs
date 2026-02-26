import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking vendor_users with Supabase IDs...\n');
  
  const users = await prisma.vendorUser.findMany({
    where: {
      supabaseUserId: {
        not: null
      }
    },
    include: {
      tenant: {
        select: {
          id: true,
          businessName: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (users.length === 0) {
    console.log('No vendor_users linked to Supabase found.');
  } else {
    console.log(`Found ${users.length} vendor_user(s) linked to Supabase:\n`);
    users.forEach((user) => {
      console.log(`Email: ${user.email}`);
      console.log(`Full Name: ${user.fullName}`);
      console.log(`Supabase ID: ${user.supabaseUserId}`);
      console.log(`Tenant: ${user.tenant?.businessName} (${user.tenant?.id})`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });
  }

  console.log('\nAll vendor_users summary:');
  const allUsers = await prisma.vendorUser.findMany({
    where: { deletedAt: null },
    include: {
      tenant: {
        select: { businessName: true }
      }
    }
  });
  console.log(`Total active vendor_users: ${allUsers.length}`);
  allUsers.forEach((u) => {
    const supabaseLinked = u.supabaseUserId ? '✓ Supabase' : '✗ Legacy';
    console.log(`  - ${u.email} (${u.tenant?.businessName}) [${supabaseLinked}]`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
