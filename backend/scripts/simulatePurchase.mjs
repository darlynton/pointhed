#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';
import formatCurrency from '../src/utils/formatCurrency.js';

async function run() {
  try {
    const tenantId = process.argv[2] || 'd1420251-dc1c-4397-b981-1c52d4068403';
    const amount = Number(process.argv[3] || 123.45);
    const pointsPreview = Number(process.argv[4] || 0);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessName: true, homeCurrency: true, whatsappConfig: true }
    });

    if (!tenant) {
      console.error('Tenant not found:', tenantId);
      process.exit(2);
    }

    const whatsappConfig = typeof tenant.whatsappConfig === 'string' ? JSON.parse(tenant.whatsappConfig) : (tenant.whatsappConfig || {});
    const template = whatsappConfig.purchase_message || '🛍️ Purchase Confirmed! You spent {amount} and earned {points} points. New balance: {balance} points';

    // Convert major -> minor (all supported currencies use 100 minor units per major unit)
    const minorScale = 100;
    const formattedAmount = formatCurrency(Math.round(amount * minorScale), tenant.homeCurrency || 'NGN');
    const balance = Number(process.argv[5] || 500);

    const message = template
      .replace(/₦\s*\{amount\}|\{amount\}/g, formattedAmount)
      .replace('{points}', String(pointsPreview))
      .replace('{balance}', String(balance));

    console.log('--- Simulated Purchase Message ---');
    console.log('Tenant:', tenant.businessName, 'homeCurrency:', tenant.homeCurrency);
    console.log('Amount (major):', amount);
    console.log('Formatted amount:', formattedAmount);
    console.log('Composed message:\n');
    console.log(message);
    console.log('----------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Simulation error:', err);
    process.exit(1);
  }
}

run();
