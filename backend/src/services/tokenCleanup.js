// Token Cleanup Service
// Removes expired and revoked refresh tokens to prevent database bloat

import cron from 'node-cron';
import prisma from '../utils/prisma.js';

const DEFAULT_CRON = '0 4 * * *'; // Daily at 4 AM

/**
 * Delete expired and revoked refresh tokens
 * @returns {Promise<{deleted: number}>}
 */
export async function cleanupExpiredTokens() {
  const now = new Date();
  
  try {
    // Delete tokens that are expired OR have been revoked for more than 7 days
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { 
            revokedAt: { 
              lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            } 
          }
        ]
      }
    });
    
    console.log(`🧹 Token cleanup: deleted ${result.count} expired/revoked tokens`);
    return { deleted: result.count };
  } catch (error) {
    console.error('❌ Token cleanup failed:', error);
    throw error;
  }
}

/**
 * Start the token cleanup scheduler
 * @param {Object} options
 * @param {string} options.cronSchedule - Cron schedule (default: daily at 4 AM)
 * @param {boolean} options.runNow - Run cleanup immediately on start
 */
export function startTokenCleanup({ cronSchedule = DEFAULT_CRON, runNow = false } = {}) {
  console.log(`🔑 Token cleanup scheduled with cron '${cronSchedule}'`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('🔑 Running scheduled token cleanup...');
    await cleanupExpiredTokens();
  });
  
  if (runNow) {
    cleanupExpiredTokens().catch(err => 
      console.error('❌ Initial token cleanup failed:', err)
    );
  }
}

export default { cleanupExpiredTokens, startTokenCleanup };
