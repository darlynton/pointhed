import prisma from '../utils/prisma.js';

// Get customer points balance
export const getPointsBalance = async (req, res) => {
  try {
    const { customerId } = req.params;

    const balance = await prisma.customerPointsBalance.findFirst({
      where: {
        customerId,
        tenantId: req.user.tenantId
      },
      include: {
        customer: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!balance) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(balance);
  } catch (error) {
    console.error('Get points balance error:', error);
    res.status(500).json({ error: 'Failed to fetch points balance' });
  }
};

// Get points transactions history
export const getPointsTransactions = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      customerId,
      tenantId: req.user.tenantId,
      ...(type && { transactionType: type })
    };

    const [transactions, total] = await Promise.all([
      prisma.pointsTransaction.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.pointsTransaction.count({ where })
    ]);

    res.json({
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get points transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// Award points (manual adjustment)
export const awardPoints = async (req, res) => {
  try {
    const { customerId, points, description } = req.body;

    // Verify customer belongs to tenant
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId: req.user.tenantId
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Create points transaction
    const transaction = await prisma.pointsTransaction.create({
      data: {
        tenantId: req.user.tenantId,
        customerId,
        transactionType: 'adjusted',
        points: parseInt(points),
        description: description || 'Manual points adjustment',
        createdByUserId: req.user.id
      }
    });

    // Update balance
    await prisma.customerPointsBalance.update({
      where: {
        customerId
      },
      data: {
        totalPointsEarned: { increment: Math.max(0, parseInt(points)) },
        currentBalance: { increment: parseInt(points) },
        lastEarnedAt: parseInt(points) > 0 ? new Date() : undefined
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Award points error:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
};

// Deduct points
export const deductPoints = async (req, res) => {
  try {
    const { customerId, points, description } = req.body;
    const pointsToDeduct = parseInt(points);

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get current balance with row lock
      const balance = await tx.customerPointsBalance.findFirst({
        where: {
          customerId,
          tenantId: req.user.tenantId
        }
      });

      if (!balance) {
        throw new Error('CUSTOMER_NOT_FOUND');
      }

      if (balance.currentBalance < pointsToDeduct) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      // Create points transaction
      const transaction = await tx.pointsTransaction.create({
        data: {
          tenantId: req.user.tenantId,
          customerId,
          transactionType: 'adjusted',
          points: -pointsToDeduct,
          description: description || 'Manual points deduction',
          createdByUserId: req.user.id
        }
      });

      // Update balance atomically
      await tx.customerPointsBalance.update({
        where: {
          customerId
        },
        data: {
          currentBalance: { decrement: pointsToDeduct }
        }
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(404).json({ error: 'Customer not found' });
    }
    if (error.message === 'INSUFFICIENT_POINTS') {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    console.error('Deduct points error:', error);
    res.status(500).json({ error: 'Failed to deduct points' });
  }
};
