import prisma from '../utils/prisma.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';

// List rewards for tenant with pagination and optional filters
export const listRewards = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { page = 1, limit = 20, active, q } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      tenantId,
      deletedAt: null,
      ...(active !== undefined ? { isActive: active === 'true' } : {}),
      ...(q ? { OR: [ { name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } } ] } : {})
    };

    const [items, total] = await Promise.all([
      prisma.reward.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.reward.count({ where })
    ]);

    res.json({ data: items, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    console.error('List rewards error:', err);
    res.status(500).json({ error: 'Failed to list rewards' });
  }
};

export const getReward = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const reward = await prisma.reward.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!reward) return res.status(404).json({ error: 'Reward not found' });
    res.json({ data: reward });
  } catch (err) {
    console.error('Get reward error:', err);
    res.status(500).json({ error: 'Failed to fetch reward' });
  }
};

const parseOptionalDate = (value, field) => {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw { status: 400, message: `Invalid ${field}` };
  }
  return date;
};

const assertNumber = (value, field, { min = null, integer = false } = {}) => {
  if (value == null) return;
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw { status: 400, message: `${field} must be a number` };
  }
  if (integer && !Number.isInteger(value)) {
    throw { status: 400, message: `${field} must be an integer` };
  }
  if (min != null && value < min) {
    throw { status: 400, message: `${field} must be >= ${min}` };
  }
};

// All supported currencies have 100 minor units
const getCurrencyMinor = (currency) => 100;

const getMinRewardValueMajor = (tenant, settings = {}) => {
  const currency = tenant?.homeCurrency || settings.currency || 'NGN';
  // Per spec: GBP/USD/EUR = 5, NGN = 500
  const map = {
    NGN: 500,
    GBP: 5,
    USD: 5,
    EUR: 5
  };
  const defaultMin = map[currency] ?? 5;
  const configured = settings.min_reward_value ?? settings.min_reward_value_major ?? settings.minRewardValueMajor;
  if (configured !== undefined && configured !== null) {
    const v = Number(configured);
    // Ensure configured value is not below the currency minimum
    if (Number.isFinite(v) && v >= defaultMin) return v;
  }
  return defaultMin;
};

export const createReward = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { name, description, pointsRequired, monetaryValueNgn, stockQuantity, maxRedemptionsPerCustomer, validFrom, validUntil, termsAndConditions, category } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (pointsRequired == null) {
      return res.status(400).json({ error: 'pointsRequired is required' });
    }
    assertNumber(pointsRequired, 'pointsRequired', { min: 1, integer: true });
    assertNumber(monetaryValueNgn, 'monetaryValueNgn', { min: 0, integer: true });
    assertNumber(stockQuantity, 'stockQuantity', { min: 0, integer: true });
    assertNumber(maxRedemptionsPerCustomer, 'maxRedemptionsPerCustomer', { min: 0, integer: true });

    const validFromDate = parseOptionalDate(validFrom, 'validFrom');
    const validUntilDate = parseOptionalDate(validUntil, 'validUntil');
    if (validFromDate && validUntilDate && validFromDate > validUntilDate) {
      return res.status(400).json({ error: 'validFrom must be before validUntil' });
    }

    if (monetaryValueNgn != null) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true, settings: true } });
      let parsedSettings = {};
      try {
        parsedSettings = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      } catch (e) {
        parsedSettings = {};
      }
      const minMajor = getMinRewardValueMajor(tenant, parsedSettings);
      if (minMajor > 0) {
        const minor = getCurrencyMinor(tenant?.homeCurrency || parsedSettings.currency || 'NGN');
        const valueMajor = Number(monetaryValueNgn) / minor;
        if (valueMajor < minMajor) {
          return res.status(400).json({ error: `monetaryValueNgn must be at least ${minMajor} in major units` });
        }
      }
    }

    const reward = await prisma.reward.create({
      data: {
        tenantId,
        name: name.trim(),
        description: description || null,
        pointsRequired,
        monetaryValueNgn: monetaryValueNgn ?? null,
        stockQuantity: stockQuantity ?? null,
        maxRedemptionsPerCustomer: maxRedemptionsPerCustomer ?? null,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        termsAndConditions: termsAndConditions || null,
        category: category || null
      }
    });

    res.status(201).json({ data: reward });
  } catch (err) {
    console.error('Create reward error:', err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Failed to create reward' });
  }
};

export const updateReward = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;
    const payload = { ...req.body };

    // Prevent changing tenantId
    delete payload.tenantId;
    // Image URLs are no longer supported in the catalog editor
    delete payload.imageUrl;
    delete payload.image_url;

    const existing = await prisma.reward.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Reward not found' });

    if (payload.name != null && (typeof payload.name !== 'string' || payload.name.trim() === '')) {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }
    if (payload.name) payload.name = payload.name.trim();
    assertNumber(payload.pointsRequired, 'pointsRequired', { min: 1, integer: true });
    assertNumber(payload.monetaryValueNgn, 'monetaryValueNgn', { min: 0, integer: true });
    assertNumber(payload.stockQuantity, 'stockQuantity', { min: 0, integer: true });
    assertNumber(payload.maxRedemptionsPerCustomer, 'maxRedemptionsPerCustomer', { min: 0, integer: true });

    if (payload.validFrom !== undefined) {
      payload.validFrom = parseOptionalDate(payload.validFrom, 'validFrom');
    }
    if (payload.validUntil !== undefined) {
      payload.validUntil = parseOptionalDate(payload.validUntil, 'validUntil');
    }
    if (payload.validFrom && payload.validUntil && payload.validFrom > payload.validUntil) {
      return res.status(400).json({ error: 'validFrom must be before validUntil' });
    }

    if (payload.monetaryValueNgn !== undefined && payload.monetaryValueNgn !== null) {
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { homeCurrency: true, settings: true } });
      let parsedSettings = {};
      try {
        parsedSettings = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      } catch (e) {
        parsedSettings = {};
      }
      const minMajor = getMinRewardValueMajor(tenant, parsedSettings);
      if (minMajor > 0) {
        const minor = getCurrencyMinor(tenant?.homeCurrency || parsedSettings.currency || 'NGN');
        const valueMajor = Number(payload.monetaryValueNgn) / minor;
        if (valueMajor < minMajor) {
          return res.status(400).json({ error: `monetaryValueNgn must be at least ${minMajor} in major units` });
        }
      }
    }

    const updated = await prisma.reward.update({ where: { id }, data: payload });
    res.json({ data: updated });
  } catch (err) {
    console.error('Update reward error:', err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Failed to update reward' });
  }
};

export const deleteReward = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id } = req.params;

    const existing = await prisma.reward.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!existing) return res.status(404).json({ error: 'Reward not found' });

    await prisma.reward.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete reward error:', err);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
};

// Redeem a reward for a customer
export const redeemReward = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const { id: rewardId } = req.params;
    const { customerId } = req.body;
    const idempotencyKey = (req.headers['x-idempotency-key'] || '').toString().trim() || null;

    if (!customerId) return res.status(400).json({ error: 'customerId is required to redeem' });

    const now = new Date();
    // Load customer and ensure tenant match
    const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null } });
    if (!customer) return res.status(404).json({ error: 'Customer not found for this tenant' });

    const result = await prisma.$transaction(async (tx) => {
      // If idempotency key provided, check existing redemption record
      if (idempotencyKey) {
        const existingRedemption = await tx.rewardRedemption.findFirst({
          where: { tenantId, idempotencyKey }
        });
        if (existingRedemption) {
          // Re-hydrate associated reward and balance for response consistency
          const existingReward = await tx.reward.findUnique({ where: { id: existingRedemption.rewardId } });
          const existingBalance = await tx.customerPointsBalance.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } });
          return { updatedBalance: existingBalance, updatedReward: existingReward, redemption: existingRedemption, pointsTransaction: null };
        }
      }

      // Load reward
      const reward = await tx.reward.findFirst({ where: { id: rewardId, tenantId, deletedAt: null } });
      if (!reward) throw { status: 404, message: 'Reward not found' };
      if (!reward.isActive) throw { status: 400, message: 'Reward is not active' };
      if (reward.validFrom && now < reward.validFrom) throw { status: 400, message: 'Reward not yet valid' };
      if (reward.validUntil && now > reward.validUntil) throw { status: 400, message: 'Reward expired' };

      // Prevent duplicate pending redemptions for the same reward/customer
      const existingPending = await tx.rewardRedemption.findFirst({ where: { tenantId, rewardId, customerId, status: 'pending', cancelledAt: null } });
      if (existingPending) throw { status: 409, message: 'Redemption already pending for this reward' };

      // Check stock
      if (reward.stockQuantity != null && reward.stockQuantity <= 0) throw { status: 400, message: 'Reward out of stock' };

      // Check max redemptions per customer
      if (reward.maxRedemptionsPerCustomer) {
        const count = await tx.rewardRedemption.count({ where: { tenantId, rewardId, customerId, cancelledAt: null } });
        if (count >= reward.maxRedemptionsPerCustomer) throw { status: 400, message: 'Customer has reached maximum redemptions for this reward' };
      }

      // Load or create points balance
      let balance = await tx.customerPointsBalance.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } });
      if (!balance) {
        balance = await tx.customerPointsBalance.create({ data: { tenantId, customerId, currentBalance: 0, totalPointsEarned: 0, totalPointsRedeemed: 0 } });
      }

      const pointsRequired = reward.pointsRequired || 0;

      // Deduct points and update balance with concurrency-safe guard
      const balanceUpdate = await tx.customerPointsBalance.updateMany({
        where: {
          tenantId,
          customerId,
          currentBalance: { gte: pointsRequired }
        },
        data: {
          currentBalance: { decrement: pointsRequired },
          totalPointsRedeemed: { increment: pointsRequired },
          lastRedeemedAt: now
        }
      });
      if (balanceUpdate.count === 0) throw { status: 400, message: 'Insufficient points balance' };
      const updatedBalance = await tx.customerPointsBalance.findUnique({ where: { tenantId_customerId: { tenantId, customerId } } });

      // Decrement stock and increment totalRedemptions with guard against negative stock
      const rewardUpdate = await tx.reward.updateMany({
        where: {
          id: rewardId,
          tenantId,
          deletedAt: null,
          ...(reward.stockQuantity != null ? { stockQuantity: { gt: 0 } } : {})
        },
        data: {
          totalRedemptions: { increment: 1 },
          ...(reward.stockQuantity != null ? { stockQuantity: { decrement: 1 } } : {})
        }
      });
      if (rewardUpdate.count === 0) throw { status: 400, message: 'Reward out of stock' };
      const updatedReward = await tx.reward.findUnique({ where: { id: rewardId } });

      // Create redemption record
      const code = `R${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).substr(2,4).toUpperCase()}`;
      const redemption = await tx.rewardRedemption.create({
        data: {
          tenantId,
          customerId,
          rewardId,
          pointsDeducted: pointsRequired,
          status: 'pending',
          redemptionCode: code,
          ...(idempotencyKey ? { idempotencyKey } : {})
        }
      });

      // Enforce max redemptions per customer after creation to avoid race duplicates
      if (reward.maxRedemptionsPerCustomer) {
        const redemptionCount = await tx.rewardRedemption.count({ where: { tenantId, rewardId, customerId, cancelledAt: null } });
        if (redemptionCount > reward.maxRedemptionsPerCustomer) {
          throw { status: 400, message: 'Customer has reached maximum redemptions for this reward' };
        }
      }

      // Create points transaction (negative points to indicate deduction)
      const pointsTransaction = await tx.pointsTransaction.create({
        data: {
          tenantId,
          customerId,
          transactionType: 'redeemed',
          points: -Math.abs(pointsRequired),
          rewardRedemptionId: redemption.id,
          description: `Redeemed reward ${reward.name}`
        }
      });

      return { updatedBalance, updatedReward, redemption, pointsTransaction };
    });

    // Send WhatsApp notification to customer with redemption code if phone number available and opted-in
    try {
      const suppressWhatsApp = Boolean(req.headers?.['x-suppress-whatsapp'] || req.body?.suppressWhatsApp);
      if (!suppressWhatsApp && customer && customer.phoneNumber && customer.optedIn) {
        const message = `🎟️ Redemption Code: ${result.redemption.redemptionCode}\n\nShow this code to the vendor to claim your reward: ${result.redemption.redemptionCode}\n\nReward: ${result.updatedReward.name}`;
        // send message asynchronously (don't block response)
        sendWhatsAppMessage({ phoneNumber: customer.phoneNumber, message, tenantId });
      }
    } catch (notifyErr) {
      console.warn('Failed to send redemption WhatsApp message:', notifyErr);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Redeem reward error:', err);
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
};

export default { listRewards, getReward, createReward, updateReward, deleteReward, redeemReward };
