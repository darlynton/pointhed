#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';

async function run() {
  try {
    const tenantIdOrVendor = process.argv[2];
    const value = process.argv[3];
    if (!tenantIdOrVendor || !value) {
      console.error('Usage: setTenantNotify.mjs <tenantId|vendorCode> <true|false>');
      process.exit(2);
    }

    const boolVal = value === 'true';

    // Find tenant
    let tenant = null;
    if (/^[0-9a-fA-F-]{36}$/.test(tenantIdOrVendor)) {
      tenant = await prisma.tenant.findUnique({ where: { id: tenantIdOrVendor } });
    } else {
      tenant = await prisma.tenant.findUnique({ where: { vendorCode: tenantIdOrVendor } });
    }

    if (!tenant) {
      console.error('Tenant not found');
      process.exit(2);
    }

    let settings = {};
    try { settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch (e) { settings = {}; }
    settings.notify_purchase = boolVal;

    const updated = await prisma.tenant.update({ where: { id: tenant.id }, data: { settings } });
    console.log('Updated tenant settings:', updated.id, settings);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
