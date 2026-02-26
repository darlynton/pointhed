// Points Expiry Enforcement Service
// Expires points that have passed their expiresAt date

import cron from 'node-cron';
import prisma from '../utils/prisma.js';
import { sendWhatsAppMessage } from './whatsapp.service.js';

const DEFAULT_CRON = '0 2 * * *'; // Daily at 2 AM

/**
 * Expire points that have passed their expiry date
 * Updates PointsTransaction.expired = true and adjusts CustomerPointsBalance
 * @returns {Promise<{processed: number, customersNotified: number}>}
 */
export async function enforcePointsExpiry() {
  const now = new Date();
  
  try {
    // Find all unexpired transactions that should be expired
    const expiredTransactions = await prisma.pointsTransaction.findMany({
      where: {
        expiresAt: { lte: now },
        expired: false,
        transactionType: { in: ['earn', 'bonus', 'welcome_bonus', 'adjustment'] },
        points: { gt: 0 } // Only expire positive point transactions
      },
      include: {
        customer: {
          select: {
            id: true,
            phoneNumber: true,
            optedIn: true,
            firstName: true,
            whatsappName: true
          }
        },
        tenant: {
          select: {
            id: true,
            businessName: true,
            settings: true
          }
        }
      }
    });

    if (expiredTransactions.length === 0) {
      console.log('🕐 Points expiry: No expired points found');
      return { processed: 0, customersNotified: 0 };
    }

    console.log(`🕐 Points expiry: Processing ${expiredTransactions.length} expired transactions`);

    // Group by customer for batch processing and notification
    const customerExpiries = new Map();
    for (const tx of expiredTransactions) {
      const key = `${tx.tenantId}_${tx.customerId}`;
      if (!customerExpiries.has(key)) {
        customerExpiries.set(key, {
          tenantId: tx.tenantId,
          customerId: tx.customerId,
          customer: tx.customer,
          tenant: tx.tenant,
          transactions: [],
          totalPoints: 0
        });
      }
      const entry = customerExpiries.get(key);
      entry.transactions.push(tx);
      entry.totalPoints += tx.points;
    }

    let processed = 0;
    let customersNotified = 0;

    // Process each customer's expired points
    for (const [key, data] of customerExpiries) {
      try {
        await prisma.$transaction(async (tx) => {
          // Mark all transactions as expired
          await tx.pointsTransaction.updateMany({
            where: {
              id: { in: data.transactions.map(t => t.id) }
            },
            data: { expired: true }
          });

          // Update customer balance
          await tx.customerPointsBalance.update({
            where: {
              tenantId_customerId: {
                tenantId: data.tenantId,
                customerId: data.customerId
              }
            },
            data: {
              currentBalance: { decrement: data.totalPoints },
              totalPointsExpired: { increment: data.totalPoints }
            }
          });

          // Create expiry transaction record
          await tx.pointsTransaction.create({
            data: {
              tenantId: data.tenantId,
              customerId: data.customerId,
              transactionType: 'expiry',
              points: -data.totalPoints,
              description: `${data.totalPoints} points expired`,
              metadata: {
                expiredTransactionIds: data.transactions.map(t => t.id),
                expiredAt: now.toISOString()
              }
            }
          });
        });

        processed += data.transactions.length;

        // Send notification to customer if opted in
        if (data.customer.optedIn && data.customer.phoneNumber) {
          try {
            // Check tenant notification settings
            let settings = {};
            try {
              settings = typeof data.tenant.settings === 'string' 
                ? JSON.parse(data.tenant.settings) 
                : (data.tenant.settings || {});
            } catch (e) {
              settings = {};
            }

            // Default to notifying about expiry
            const notifyExpiry = settings.notify_points_expiry !== false;
            
            if (notifyExpiry) {
              const customerName = data.customer.firstName || data.customer.whatsappName || 'there';
              await sendWhatsAppMessage({
                phoneNumber: data.customer.phoneNumber,
                message: `⏰ Points Expired\n\nHi ${customerName}, ${data.totalPoints.toLocaleString()} points from ${data.tenant.businessName} have expired.\n\nEarn more points with your next purchase!\n\n- ${data.tenant.businessName}`,
                tenantId: data.tenantId
              });
              customersNotified++;
            }
          } catch (notifyErr) {
            console.error(`Failed to notify customer ${data.customerId} about expired points:`, notifyErr);
          }
        }
      } catch (err) {
        console.error(`Failed to expire points for customer ${data.customerId}:`, err);
      }
    }

    console.log(`🕐 Points expiry complete: ${processed} transactions expired, ${customersNotified} customers notified`);
    return { processed, customersNotified };
  } catch (error) {
    console.error('❌ Points expiry failed:', error);
    throw error;
  }
}

/**
 * Check for points expiring soon and optionally notify customers
 * @param {number} daysAhead - Number of days to look ahead (default: 7)
 * @returns {Promise<{expiringSoon: number, notified: number}>}
 */
export async function checkExpiringPointsSoon(daysAhead = 7) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  try {
    // Find transactions expiring within the window that haven't been notified
    const expiringTransactions = await prisma.pointsTransaction.findMany({
      where: {
        expiresAt: { 
          gt: now,
          lte: futureDate 
        },
        expired: false,
        transactionType: { in: ['earn', 'bonus', 'welcome_bonus', 'adjustment'] },
        points: { gt: 0 },
        // Check if we haven't already sent expiry warning (stored in metadata)
        NOT: {
          metadata: {
            path: ['expiryWarningAt'],
            not: null
          }
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            phoneNumber: true,
            optedIn: true,
            firstName: true,
            whatsappName: true
          }
        },
        tenant: {
          select: {
            id: true,
            businessName: true,
            settings: true
          }
        }
      }
    });

    // Group by customer
    const customerExpiringMap = new Map();
    for (const tx of expiringTransactions) {
      const key = `${tx.tenantId}_${tx.customerId}`;
      if (!customerExpiringMap.has(key)) {
        customerExpiringMap.set(key, {
          tenantId: tx.tenantId,
          customerId: tx.customerId,
          customer: tx.customer,
          tenant: tx.tenant,
          transactions: [],
          totalPoints: 0,
          earliestExpiry: tx.expiresAt
        });
      }
      const entry = customerExpiringMap.get(key);
      entry.transactions.push(tx);
      entry.totalPoints += tx.points;
      if (tx.expiresAt < entry.earliestExpiry) {
        entry.earliestExpiry = tx.expiresAt;
      }
    }

    let notified = 0;

    for (const [key, data] of customerExpiringMap) {
      if (!data.customer.optedIn || !data.customer.phoneNumber) continue;

      try {
        let settings = {};
        try {
          settings = typeof data.tenant.settings === 'string' 
            ? JSON.parse(data.tenant.settings) 
            : (data.tenant.settings || {});
        } catch (e) {
          settings = {};
        }

        const notifyExpiryWarning = settings.notify_points_expiry_warning !== false;
        
        if (notifyExpiryWarning) {
          const customerName = data.customer.firstName || data.customer.whatsappName || 'there';
          const daysUntil = Math.ceil((data.earliestExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
          
          await sendWhatsAppMessage({
            phoneNumber: data.customer.phoneNumber,
            message: `⚠️ Points Expiring Soon\n\nHi ${customerName}, you have ${data.totalPoints.toLocaleString()} points at ${data.tenant.businessName} expiring in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.\n\nRedeem them before they expire!\n\n- ${data.tenant.businessName}`,
            tenantId: data.tenantId
          });

          // Mark transactions as warned
          await prisma.pointsTransaction.updateMany({
            where: { id: { in: data.transactions.map(t => t.id) } },
            data: {
              metadata: {
                expiryWarningAt: now.toISOString()
              }
            }
          });

          notified++;
        }
      } catch (err) {
        console.error(`Failed to send expiry warning to customer ${data.customerId}:`, err);
      }
    }

    console.log(`🕐 Expiry warnings: ${expiringTransactions.length} transactions expiring soon, ${notified} customers notified`);
    return { expiringSoon: expiringTransactions.length, notified };
  } catch (error) {
    console.error('❌ Expiry warning check failed:', error);
    throw error;
  }
}

/**
 * Start the points expiry scheduler
 * @param {Object} options
 * @param {string} options.cronSchedule - Cron schedule (default: daily at 2 AM)
 * @param {boolean} options.runNow - Run expiry check immediately on start
 * @param {boolean} options.sendWarnings - Also send expiry warnings (default: true)
 */
export function startPointsExpiryScheduler({ 
  cronSchedule = DEFAULT_CRON, 
  runNow = false,
  sendWarnings = true 
} = {}) {
  console.log(`🕐 Points expiry scheduled with cron '${cronSchedule}'`);
  
  cron.schedule(cronSchedule, async () => {
    console.log('🕐 Running scheduled points expiry enforcement...');
    await enforcePointsExpiry();
    
    if (sendWarnings) {
      console.log('🕐 Checking for points expiring soon...');
      await checkExpiringPointsSoon(7); // Warn 7 days ahead
    }
  });
  
  if (runNow) {
    enforcePointsExpiry().catch(err => 
      console.error('❌ Initial points expiry check failed:', err)
    );
  }
}

export default { enforcePointsExpiry, checkExpiringPointsSoon, startPointsExpiryScheduler };
