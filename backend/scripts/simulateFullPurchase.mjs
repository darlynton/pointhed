#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';
import * as purchaseCtrl from '../src/controllers/purchase.controller.js';
import * as whatsapp from '../src/services/whatsapp.service.js';

async function run() {
  try {
    const tenantId = process.argv[2] || 'd1420251-dc1c-4397-b981-1c52d4068403';
    const customerId = process.argv[3];
    const amount = Number(process.argv[4] || 1000);

    if (!customerId) {
      console.error('Usage: simulateFullPurchase.mjs <tenantId> <customerId> <amount>');
      process.exit(2);
    }

    // We'll run the real controller; WhatsApp sends will be no-ops if credentials are not configured.

    // Build mock req/res
    const mockReq = {
      body: {
        customerId,
        amountNgn: amount,
        // Do not precompute pointsEarned in simulation; let server compute using tenant settings
        description: `Purchase of ${amount}`,
        purchaseDate: new Date().toISOString()
      },
      // No real vendor user in simulation environment — leave logged user id null
      user: { id: null, tenantId }
    };

    const responses = [];
    const mockRes = {
      status: (code) => ({ json: async (data) => { responses.push({ code, data }); } }),
      json: async (data) => responses.push({ code: 200, data })
    };

    await purchaseCtrl.createPurchase(mockReq, mockRes);

    console.log('Simulation completed. Check backend logs for WhatsApp send attempts (messages may be logged if credentials not configured).');
    console.log('Controller responses:');
    console.dir(responses, { depth: 4 });


    process.exit(0);
  } catch (err) {
    console.error('Simulation error:', err);
    process.exit(1);
  }
}

run();
