import prisma from '../utils/prisma.js';

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const getDayLabel = (date) => {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const getDashboardAnalytics = async (req, res) => {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant context not found' });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - DAYS_30_MS);
  const sevenDaysAgo = new Date(now.getTime() - DAYS_7_MS);

  try {
    const [totalCustomers, newCustomers, activeCustomers] = await Promise.all([
      prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      prisma.customer.count({ where: { tenantId, deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.customer.count({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { lastPurchaseAt: { gte: thirtyDaysAgo } },
            { purchases: { some: { createdAt: { gte: thirtyDaysAgo } } } }
          ]
        }
      })
    ]);

    const purchaseAggregate = await prisma.purchase.aggregate({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      _sum: { amountNgn: true, pointsAwarded: true },
      _avg: { amountNgn: true },
      _count: true
    });

    const pointsAggregate = await prisma.customerPointsBalance.aggregate({
      where: { tenantId },
      _sum: {
        totalPointsEarned: true,
        totalPointsRedeemed: true,
        currentBalance: true
      }
    });

    const purchasesLast7 = await prisma.purchase.findMany({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } },
      select: { amountNgn: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const weeklyMap = new Map();
    for (let i = 0; i < 7; i++) {
      const day = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      const key = startOfDay(day).toISOString();
      weeklyMap.set(key, { name: getDayLabel(day), purchases: 0, revenue: 0 });
    }

    purchasesLast7.forEach((purchase) => {
      const dayKey = startOfDay(purchase.createdAt).toISOString();
      if (!weeklyMap.has(dayKey)) return;
      const entry = weeklyMap.get(dayKey);
      entry.purchases += 1;
      entry.revenue += purchase.amountNgn || 0;
    });

    const weeklyPurchases = Array.from(weeklyMap.values());

    const topCustomers = await prisma.customer.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { totalSpentNgn: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        totalSpentNgn: true,
        totalPurchases: true
      }
    });

    const rewardGroups = await prisma.rewardRedemption.groupBy({
      by: ['rewardId'],
      where: { tenantId },
      _count: { rewardId: true },
      orderBy: { _count: { rewardId: 'desc' } },
      take: 5
    });

    const rewardLookup = rewardGroups.length
      ? await prisma.reward.findMany({
          where: { id: { in: rewardGroups.map((r) => r.rewardId) } },
          select: { id: true, name: true }
        })
      : [];

    const topRewards = rewardGroups.map((group) => {
      const reward = rewardLookup.find((r) => r.id === group.rewardId);
      return {
        reward_id: group.rewardId,
        reward_name: reward?.name || 'Reward',
        redemptions: group._count.rewardId
      };
    });

    const messagesReceived = await prisma.whatsAppMessage.count({
      where: { tenantId, direction: 'inbound', createdAt: { gte: thirtyDaysAgo } }
    }).catch(() => 0);

    const messagesSent = await prisma.whatsAppMessage.count({
      where: { tenantId, direction: 'outbound', createdAt: { gte: thirtyDaysAgo } }
    }).catch(() => 0);

    const totalRevenue = purchaseAggregate._sum.amountNgn || 0;
    const totalPurchases = purchaseAggregate._count || 0;
    const avgOrderValue = purchaseAggregate._avg.amountNgn || 0;

    const totalPointsEarned = pointsAggregate._sum.totalPointsEarned || 0;
    const totalPointsRedeemed = pointsAggregate._sum.totalPointsRedeemed || 0;
    const currentPointsBalance = pointsAggregate._sum.currentBalance || 0;

    const redemptionRate = totalPointsEarned > 0 ? (totalPointsRedeemed / totalPointsEarned) * 100 : 0;
    const growthRate = totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0;

    return res.json({
      overview: {
        period: 'last_30_days',
        customers: {
          total: totalCustomers,
          new: newCustomers,
          active: activeCustomers,
          growth_rate: Number(growthRate.toFixed(1))
        },
        purchases: {
          total: totalPurchases,
          total_revenue_ngn: totalRevenue,
          average_order_value_ngn: Math.round(avgOrderValue || 0)
        },
        points: {
          total_earned: totalPointsEarned,
          total_redeemed: totalPointsRedeemed,
          redemption_rate: Number(redemptionRate.toFixed(1))
        },
        engagement: {
          messages_received: messagesReceived,
          messages_sent: messagesSent
        }
      },
      charts: {
        weeklyPurchases
      },
      pointsDistribution: {
        earned: totalPointsEarned,
        redeemed: totalPointsRedeemed,
        active: currentPointsBalance
      },
      topCustomers: topCustomers.map((customer) => ({
        customer_id: customer.id,
        phone_number: customer.phoneNumber,
        first_name: customer.firstName || '',
        last_name: customer.lastName || '',
        total_spent_ngn: customer.totalSpentNgn || 0,
        total_purchases: customer.totalPurchases || 0
      })),
      topRewards
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard analytics' });
  }
};
