#!/usr/bin/env node
import dotenv from 'dotenv';
import prisma from '../src/utils/prisma.js';

dotenv.config();

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: node clearAllRewardImages.mjs <tenantId>');
  process.exit(1);
}

async function run() {
  try {
    const affected = await prisma.reward.updateMany({
      where: { tenantId, imageUrl: { not: null } },
      data: { imageUrl: null }
    });
    console.log('Cleared imageUrl on rows:', affected.count);
  } catch (err) {
    console.error('Error clearing image urls:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
