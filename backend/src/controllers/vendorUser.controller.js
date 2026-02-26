import prisma from '../utils/prisma.js';

export const createStaff = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context missing' });

    const { email, fullName, phoneNumber } = req.body || {};
    if (!email || !fullName) {
      return res.status(400).json({ error: 'email and fullName are required' });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Prevent duplicates within the same tenant
    const existing = await prisma.vendorUser.findFirst({
      where: { tenantId, email, deletedAt: null },
      select: { id: true }
    });
    if (existing) {
      return res.status(400).json({ error: 'email already exists for this tenant' });
    }

    const staff = await prisma.vendorUser.create({
      data: {
        tenantId,
        email,
        fullName,
        phoneNumber: phoneNumber || null,
        role: 'staff',
        isActive: true,
        passwordHash: '',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true
      }
    });

    return res.status(201).json({ user: staff, message: 'Staff invited successfully' });
  } catch (error) {
    console.error('Create staff error:', error);
    return res.status(500).json({ error: 'Failed to create staff' });
  }
};

export const listTeam = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context missing' });

    const users = await prisma.vendorUser.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        phoneNumber: true
      },
      orderBy: [{ role: 'asc' }, { fullName: 'asc' }]
    });

    return res.json({ users });
  } catch (error) {
    console.error('List team error:', error);
    return res.status(500).json({ error: 'Failed to list team' });
  }
};

export const updateStaffStatus = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context missing' });

    const { id } = req.params;
    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean required' });
    }

    const user = await prisma.vendorUser.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, role: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'owner') return res.status(400).json({ error: 'Cannot deactivate owner' });

    const updated = await prisma.vendorUser.update({
      where: { id },
      data: { isActive },
      select: { id: true, email: true, fullName: true, role: true, isActive: true }
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('Update staff status error:', error);
    return res.status(500).json({ error: 'Failed to update staff status' });
  }
};
