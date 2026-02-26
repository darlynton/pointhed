#!/usr/bin/env node
/**
 * Manual provisioning script for Supabase users who didn't complete email confirmation
 * 
 * Usage: node scripts/manual-provision.js <supabase-user-id> <business-name> <phone> <full-name>
 * Example: node scripts/manual-provision.js abc-123-def "My Coffee Shop" "+447911123456" "John Doe"
 */

import prisma from '../src/utils/prisma.js';

// Generate unique vendor code
const generateVendorCode = async () => {
  const prefix = 'VND';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    const random = Math.floor(100000 + Math.random() * 900000);
    code = `${prefix}${random}`;
    
    const existing = await prisma.tenant.findUnique({
      where: { vendorCode: code }
    });
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// Generate slug from business name
const generateSlug = async (businessName) => {
  let slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let finalSlug = slug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: finalSlug }
    });
    
    if (!existing) {
      break;
    }
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
};

async function manualProvision() {
  const [,, supabaseUserId, businessName, contactPhone, fullName, email] = process.argv;

  if (!supabaseUserId || !businessName || !contactPhone || !fullName) {
    console.error('❌ Missing required arguments');
    console.log('\nUsage: node scripts/manual-provision.js <supabase-user-id> <business-name> <phone> <full-name> [email]');
    console.log('Example: node scripts/manual-provision.js abc-123-def "My Coffee Shop" "+447911123456" "John Doe" "john@example.com"');
    process.exit(1);
  }

  try {
    // Check if already provisioned
    const existing = await prisma.vendorUser.findFirst({
      where: { supabaseUserId, deletedAt: null },
      include: { tenant: true }
    });

    if (existing) {
      console.log('✅ User already provisioned:');
      console.log(`   Business: ${existing.tenant.businessName}`);
      console.log(`   Vendor Code: ${existing.tenant.vendorCode}`);
      console.log(`   Email: ${existing.email}`);
      return;
    }

    const vendorCode = await generateVendorCode();
    const slug = await generateSlug(businessName);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Use email if provided, otherwise try to find from Supabase
    const userEmail = email || `${supabaseUserId}@temp.local`;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          businessName,
          slug,
          vendorCode,
          phoneNumber: contactPhone,
          email: userEmail,
          subscriptionStatus: 'trial',
          trialEndsAt,
          isActive: true,
          onboardingCompleted: false,
          settings: {
            businessType: 'retail',
            pointsPerNaira: 1,
            nairaPerPoint: 1,
            minRedemptionPoints: 100
          }
        }
      });

      const vendorUser = await tx.vendorUser.create({
        data: {
          tenantId: tenant.id,
          email: userEmail,
          passwordHash: '',
          supabaseUserId,
          fullName,
          role: 'owner',
          isActive: true
        }
      });

      return { tenant, vendorUser };
    });

    console.log('✅ Successfully provisioned vendor account:');
    console.log(`   Business Name: ${result.tenant.businessName}`);
    console.log(`   Vendor Code: ${result.tenant.vendorCode}`);
    console.log(`   Email: ${result.vendorUser.email}`);
    console.log(`   Full Name: ${result.vendorUser.fullName}`);
    console.log(`   Supabase User ID: ${supabaseUserId}`);
    console.log(`\n🎉 User can now log in!`);

  } catch (error) {
    console.error('❌ Provisioning failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

manualProvision();
