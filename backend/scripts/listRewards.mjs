#!/usr/bin/env node
import prisma from '../src/utils/prisma.js';

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: node listRewards.mjs <tenantId>');
  process.exit(2);
}

async function run() {
  try {
    const rewards = await prisma.reward.findMany({ where: { tenantId: tenantId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify({ count: rewards.length, rewards: rewards.slice(0, 20) }, null, 2));
  } catch (e) {
    console.error('Error querying rewards:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
