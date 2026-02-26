#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';

async function run() {
  try {
    const tenantId = process.argv[2];
    if (!tenantId) {
      console.error('Usage: getTenantSettings.mjs <tenantId>');
      process.exit(2);
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, settings: true, homeCurrency: true } });
    if (!tenant) {
      console.error('Tenant not found');
      process.exit(2);
    }
    let settings = {};
    try { settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch (e) { settings = tenant.settings || {}; }
    console.log({ id: tenant.id, homeCurrency: tenant.homeCurrency, settings }, null, 2);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
