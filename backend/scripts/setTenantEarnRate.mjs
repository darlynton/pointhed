#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';

async function run() {
  try {
    const tenantIdOrVendor = process.argv[2];
    const value = process.argv[3];
    if (!tenantIdOrVendor || value === undefined) {
      console.error('Usage: setTenantEarnRate.mjs <tenantId|vendorCode> <majorUnitsPerPoint>');
      process.exit(2);
    }

    const v = Number(value);
    if (!Number.isFinite(v) || v < 1) {
      console.error('Value must be a number >= 1');
      process.exit(2);
    }

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
    settings.major_units_per_point = v;

    const updated = await prisma.tenant.update({ where: { id: tenant.id }, data: { settings } });
    console.log('Updated tenant settings for', updated.id, settings);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
