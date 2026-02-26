#!/usr/bin/env node
import dotenv from 'dotenv';
import prisma from '../src/utils/prisma.js';

dotenv.config();

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: node fixRewardImages.mjs <tenantId>');
  process.exit(1);
}

async function run() {
  try {
    const target = 'photo-1544025162-d76694265947';
    const affected = await prisma.reward.updateMany({
      where: {
        tenantId,
        imageUrl: { contains: target }
      },
      data: { imageUrl: null }
    });
    console.log('Updated rows:', affected.count);
  } catch (err) {
    console.error('Error updating rewards:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run(process.argv[2]);
