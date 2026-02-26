#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';
import * as claimCtrl from '../src/controllers/purchaseClaim.controller.js';

async function run() {
  try {
    const tenantIdOrVendor = process.argv[2];
    const amountMajor = Number(process.argv[3] || 100);
    const phoneArg = process.argv[4];

    if (!tenantIdOrVendor) {
      console.error('Usage: simulateClaim.mjs <tenantId|vendorCode> <amountMajor> [phone]');
      process.exit(2);
    }

    // Try to detect if the first arg is a UUID for tenantId or a vendorCode
    let tenant = null;
    if (/^[0-9a-fA-F-]{36}$/.test(tenantIdOrVendor)) {
      tenant = await prisma.tenant.findUnique({ where: { id: tenantIdOrVendor }, select: { id: true, vendorCode: true, businessName: true, homeCurrency: true } });
    } else {
      tenant = await prisma.tenant.findUnique({ where: { vendorCode: tenantIdOrVendor }, select: { id: true, vendorCode: true, businessName: true, homeCurrency: true } });
    }

    if (!tenant) {
      console.error('Tenant not found for', tenantIdOrVendor);
      process.exit(2);
    }

    // Choose a customer phone if not provided
    let phone = phoneArg;
    if (!phone) {
      const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id, deletedAt: null } });
      if (!customer) {
        console.error('No customer found for tenant', tenant.id, '- please provide a phone number');
        process.exit(2);
      }
      phone = customer.phoneNumber;
      console.log('Auto-selected customer phone:', phone);
    }

    const minorScale = 100;
    const amountMinor = Math.round(amountMajor * minorScale);

    console.log(`Simulating claim for tenant ${tenant.businessName} (${tenant.vendorCode})`);
    console.log(`Phone: ${phone}  Amount (major): ${amountMajor}  Amount (minor): ${amountMinor}  Currency: ${tenant.homeCurrency || 'NGN'}`);

    const mockReq = {
      body: {
        phoneNumber: phone,
        amountNgn: amountMinor,
        purchaseDate: new Date().toISOString(),
        channel: 'physical_store',
        vendorCode: tenant.vendorCode
      }
    };

    const mockRes = {
      status: (code) => ({ json: async (data) => { console.log('Response', code, data); } }),
      json: async (data) => console.log('Response', data)
    };

    await claimCtrl.submitClaim(mockReq, mockRes);
    process.exit(0);
  } catch (err) {
    console.error('Simulation error:', err);
    process.exit(1);
  }
}

run();
