import prisma from '../utils/prisma.js';
import { sendWhatsAppMessage, deleteRedemptionQrImage } from '../services/whatsapp.service.js';

/**
 * Get pending redemptions for tenant
 * GET /api/v1/redemptions
 */
export const getPendingRedemptions = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { status = 'pending', limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const statusFilter = status && status !== 'all' ? status : null;

    // Auto-expire unfulfilled redemptions after 24 hours
    const expiryCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.rewardRedemption.updateMany({
      where: {
        tenantId,
        cancelledAt: null,
        status: { in: ['pending', 'verified'] },
        createdAt: { lt: expiryCutoff }
      },
      data: { status: 'expired' }
    });

    const redemptions = await prisma.rewardRedemption.findMany({
      where: {
        tenantId,
        ...(statusFilter ? { status: statusFilter, cancelledAt: null } : {})
      },
      include: {
        reward: { select: { name: true, pointsRequired: true } },
        customer: { select: { id: true, phoneNumber: true, firstName: true, lastName: true, email: true } },
        verifiedByUser: { select: { id: true, fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.rewardRedemption.count({
      where: {
        tenantId,
        ...(statusFilter ? { status: statusFilter, cancelledAt: null } : {})
      }
    });

    res.json({
      data: redemptions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    console.error('Get redemptions error:', err);
    res.status(500).json({ error: 'Failed to fetch redemptions' });
  }
};

/**
 * Verify a redemption code
 * POST /api/v1/redemptions/verify
 * Body: { redemptionCode: "RLVGOX8RNFJ" }
 */
export const verifyRedemptionCode = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.id;
    const { redemptionCode } = req.body;

    if (!redemptionCode) {
      return res.status(400).json({ error: 'Redemption code required' });
    }

    // Find the redemption
    const redemption = await prisma.rewardRedemption.findFirst({
      where: {
        redemptionCode: redemptionCode.toUpperCase().trim(),
        tenantId,
        cancelledAt: null
      },
      include: {
        reward: { select: { id: true, name: true, pointsRequired: true, description: true } },
        customer: { select: { id: true, phoneNumber: true, firstName: true, lastName: true, email: true, optedIn: true } }
      }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption code not found or already cancelled' });
    }

    if (redemption.status === 'fulfilled') {
      return res.status(400).json({ error: 'Code already fulfilled', code: redemption.redemptionCode });
    }

    if (redemption.status === 'expired') {
      return res.status(400).json({ error: 'Code expired', code: redemption.redemptionCode });
    }

    // Expire redemptions after 24 hours
    const createdAt = redemption.createdAt ? new Date(redemption.createdAt).getTime() : null;
    if (createdAt && Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      const expired = await prisma.rewardRedemption.update({
        where: { id: redemption.id },
        data: { status: 'expired' },
        include: {
          reward: { select: { name: true } },
          customer: { select: { phoneNumber: true, optedIn: true } }
        }
      });
      try {
        if (expired.customer?.phoneNumber && expired.customer?.optedIn) {
          const message = `⏳ Your redemption code has expired.\n\nCode: ${expired.redemptionCode}\nReward: ${expired.reward.name}\n\nPlease request a new redemption from the business.`;
          sendWhatsAppMessage({ phoneNumber: expired.customer.phoneNumber, message, tenantId }).catch(err =>
            console.warn('Failed to send expiration notification:', err)
          );
        }
      } catch (notifyErr) {
        console.warn('WhatsApp notification error:', notifyErr);
      }
      return res.status(400).json({ error: 'Code expired', code: expired.redemptionCode });
    }

    // Update to verified status
    const updated = await prisma.rewardRedemption.update({
      where: { id: redemption.id },
      data: {
        status: 'pending',
        verifiedByUserId: userId,
        verifiedAt: new Date()
      },
      include: {
        reward: true,
        customer: true,
        verifiedByUser: { select: { fullName: true } }
      }
    });

    // WhatsApp notifications intentionally suppressed for verification in admin flow

    res.json({
      success: true,
      data: {
        id: updated.id,
        code: updated.redemptionCode,
        status: updated.status,
        verifiedAt: updated.verifiedAt,
        rewardId: updated.rewardId,
        customerId: updated.customerId,
        reward: updated.reward,
        customer: { name: `${updated.customer.firstName} ${updated.customer.lastName}`, phone: updated.customer.phoneNumber }
      }
    });
  } catch (err) {
    console.error('Verify redemption error:', err);
    res.status(500).json({ error: 'Failed to verify redemption code' });
  }
};

/**
 * Fulfill a redemption
 * POST /api/v1/redemptions/:id/fulfill
 * Body: { notes: "Gave customer espresso shot" }
 */
export const fulfillRedemption = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    const redemption = await prisma.rewardRedemption.findFirst({
      where: { id, tenantId, cancelledAt: null }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    if (redemption.status === 'fulfilled') {
      return res.status(400).json({ error: 'Already fulfilled' });
    }

    if (redemption.status !== 'verified' && redemption.status !== 'pending') {
      return res.status(400).json({ error: `Cannot fulfill redemption with status: ${redemption.status}` });
    }

    const updated = await prisma.rewardRedemption.update({
      where: { id },
      data: {
        status: 'fulfilled',
        fulfilledAt: new Date(),
        fulfilmentNotes: notes || null
      },
      include: {
        reward: { select: { name: true } },
        customer: { select: { phoneNumber: true, firstName: true, optedIn: true } }
      }
    });

    // Send WhatsApp notification on fulfillment
    try {
      if (updated.customer?.phoneNumber && updated.customer?.optedIn) {
        const message = `🎉 Reward fulfilled!\n\n✓ ${updated.reward.name} has been given to you.\n\nThank you for your loyalty!`;
        sendWhatsAppMessage({ phoneNumber: updated.customer.phoneNumber, message, tenantId }).catch(err =>
          console.warn('Failed to send fulfillment notification:', err)
        );
      }
    } catch (notifyErr) {
      console.warn('WhatsApp notification error:', notifyErr);
    }

    // Cleanup QR image once fulfilled (best-effort)
    try {
      await deleteRedemptionQrImage(updated.redemptionCode);
    } catch (cleanupErr) {
      console.warn('QR cleanup error:', cleanupErr);
    }

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        fulfilledAt: updated.fulfilledAt,
        fulfilmentNotes: updated.fulfilmentNotes
      }
    });
  } catch (err) {
    console.error('Fulfill redemption error:', err);
    res.status(500).json({ error: 'Failed to fulfill redemption' });
  }
};

/**
 * Cancel a redemption
 * POST /api/v1/redemptions/:id/cancel
 * Body: { reason: "Customer lost code" }
 */
export const cancelRedemption = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    const redemption = await prisma.rewardRedemption.findFirst({
      where: { id, tenantId }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    if (redemption.cancelledAt) {
      return res.status(400).json({ error: 'Already cancelled' });
    }

    if (redemption.status === 'fulfilled') {
      return res.status(400).json({ error: 'Cannot cancel a fulfilled redemption' });
    }

    // Begin transaction to refund points
    const result = await prisma.$transaction(async (tx) => {
      // Update redemption status
      const updated = await tx.rewardRedemption.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason || null
        }
      });

      // Refund points to customer
      const balance = await tx.customerPointsBalance.findUnique({
        where: {
          tenantId_customerId: {
            tenantId,
            customerId: redemption.customerId
          }
        }
      });

      if (balance) {
        await tx.customerPointsBalance.update({
          where: {
            tenantId_customerId: {
              tenantId,
              customerId: redemption.customerId
            }
          },
          data: {
            currentBalance: { increment: redemption.pointsDeducted },
            totalPointsRedeemed: { decrement: redemption.pointsDeducted }
          }
        });
      }

      // Log refund transaction
      await tx.pointsTransaction.create({
        data: {
          tenantId,
          customerId: redemption.customerId,
          transactionType: 'refunded',
          points: redemption.pointsDeducted,
          rewardRedemptionId: redemption.id,
          description: `Refund for cancelled redemption: ${reason || 'No reason provided'}`
        }
      });

      return updated;
    });

    // Send WhatsApp notification on cancellation
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: redemption.customerId },
        select: { phoneNumber: true, optedIn: true }
      });

      if (customer?.phoneNumber && customer?.optedIn) {
        const message = `ℹ️ Your redemption code (${redemption.redemptionCode}) has been cancelled.\n\n✓ ${redemption.pointsDeducted} points have been refunded to your account.\n\nReason: ${reason || 'Cancelled by vendor'}`;
        sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message, tenantId }).catch(err =>
          console.warn('Failed to send cancellation notification:', err)
        );
      }
    } catch (notifyErr) {
      console.warn('WhatsApp notification error:', notifyErr);
    }

    res.json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        pointsRefunded: redemption.pointsDeducted,
        cancelledAt: result.cancelledAt
      }
    });
  } catch (err) {
    console.error('Cancel redemption error:', err);
    res.status(500).json({ error: 'Failed to cancel redemption' });
  }
};

/**
 * Get redemption stats
 * GET /api/v1/redemptions/stats
 */
export const getRedemptionStats = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;

    const stats = await prisma.rewardRedemption.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true
    });

    const total = stats.reduce((sum, s) => sum + s._count, 0);

    const statusMap = {};
    stats.forEach(s => {
      statusMap[s.status] = s._count;
    });

    res.json({
      data: {
        total,
        pending: statusMap.pending || 0,
        verified: statusMap.verified || 0,
        fulfilled: statusMap.fulfilled || 0,
        cancelled: statusMap.cancelled || 0,
        completionRate: total > 0 ? ((statusMap.fulfilled || 0) / total * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

export default {
  getPendingRedemptions,
  verifyRedemptionCode,
  fulfillRedemption,
  cancelRedemption,
  getRedemptionStats
};
