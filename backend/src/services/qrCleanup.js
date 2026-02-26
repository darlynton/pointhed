import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import { deleteRedemptionQrImage } from './whatsapp.service.js';

const RETENTION_DAYS = Number(process.env.QR_RETENTION_DAYS || 7);
const CRON_EXPR = process.env.QR_CLEANUP_CRON || '0 3 * * *';

let scheduledJob = null;

export const runQrCleanup = async ({ dryRun = false } = {}) => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const redemptions = await prisma.rewardRedemption.findMany({
    where: {
      updatedAt: { lt: cutoff },
      status: { in: ['fulfilled', 'expired', 'cancelled'] }
    },
    select: { id: true, redemptionCode: true }
  });

  let deleted = 0;
  for (const redemption of redemptions) {
    if (!redemption.redemptionCode) continue;
    if (!dryRun) {
      await deleteRedemptionQrImage(redemption.redemptionCode);
    }
    deleted += 1;
  }

  return { scanned: redemptions.length, deleted };
};

export const startQrCleanup = ({ runNow = false } = {}) => {
  if (process.env.QR_CLEANUP_DISABLED === 'true') {
    console.log('QR cleanup disabled via QR_CLEANUP_DISABLED=true');
    return;
  }

  if (scheduledJob) {
    try { scheduledJob.stop(); } catch (e) { /* ignore */ }
    scheduledJob = null;
  }

  try {
    scheduledJob = cron.schedule(CRON_EXPR, async () => {
      try {
        const result = await runQrCleanup();
        console.log(`🧹 QR cleanup complete: scanned ${result.scanned}, deleted ${result.deleted}`);
      } catch (err) {
        console.error('QR cleanup failed:', err);
      }
    });
    console.log(`QR cleanup scheduled with cron '${CRON_EXPR}' (retention ${RETENTION_DAYS} days)`);
  } catch (err) {
    console.error('Failed to schedule QR cleanup:', err);
  }

  if (runNow) {
    runQrCleanup()
      .then((result) => {
        console.log(`🧹 QR cleanup complete: scanned ${result.scanned}, deleted ${result.deleted}`);
      })
      .catch((err) => {
        console.error('QR cleanup failed:', err);
      });
  }
};