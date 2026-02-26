import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { issueTokens, rotateRefreshToken, revokeRefreshToken } from '../services/token.service.js';

// Platform Admin Login
export const platformAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.platformAdmin.findUnique({
      where: { email }
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() }
    });

    const payload = {
      user_id: admin.id,
      email: admin.email,
      role: admin.role,
      user_type: 'platform_admin'
    };

    const { accessToken, refreshToken } = await issueTokens({
      payload,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15 minutes
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName
      }
    });
  } catch (error) {
    console.error('Platform admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Vendor User Login
export const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.vendorUser.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            vendorCode: true,
            isActive: true
          }
        }
      }
    });

    if (!user || !user.tenant.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.vendorUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const payload = {
      user_id: user.id,
      tenant_id: user.tenantId,
      email: user.email,
      role: user.role,
      user_type: 'vendor'
    };

    const { accessToken, refreshToken } = await issueTokens({
      payload,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        tenant: {
          id: user.tenant.id,
          businessName: user.tenant.businessName,
          vendorCode: user.tenant.vendorCode
        }
      }
    });
  } catch (error) {
    console.error('Vendor login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh Token
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { accessToken, refreshToken: newRefresh, expiresIn } = await rotateRefreshToken({
      refreshToken: refresh_token,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      access_token: accessToken,
      refresh_token: newRefresh,
      expires_in: expiresIn
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Logout (client-side token removal, could add token blacklist)
export const logout = async (req, res) => {
  if (req.body?.refresh_token) {
    await revokeRefreshToken(req.body.refresh_token);
  }
  res.status(204).send();
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    if (req.user.userType === 'platform_admin') {
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true
        }
      });
      return res.json({ user: admin, userType: 'platform_admin' });
    } else {
      const user = await prisma.vendorUser.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              businessName: true,
              vendorCode: true,
              onboardingCompleted: true
            }
          }
        }
      });
      return res.json({ user, userType: 'vendor' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
