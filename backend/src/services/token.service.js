import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET;
// Increase default token expiry to 1 hour (was 15m) - refresh handles renewals
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function safeTruncate(value, max = 255) {
  if (!value) return null;
  return String(value).slice(0, max);
}

function computeExpiryDate(token, fallbackMs) {
  const decoded = jwt.decode(token);
  if (decoded && decoded.exp) return new Date(decoded.exp * 1000);
  return new Date(Date.now() + fallbackMs);
}

export async function issueTokens({ payload, ipAddress, userAgent }) {
  const jti = randomUUID();
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN, jwtid: jti });
  const expiresAt = computeExpiryDate(refreshToken, 7 * 24 * 60 * 60 * 1000);

  const tokenHash = await bcrypt.hash(refreshToken, 10);

  await prisma.refreshToken.create({
    data: {
      userId: payload.user_id,
      userType: payload.user_type,
      tenantId: payload.tenant_id || null,
      tokenJti: jti,
      tokenHash,
      ipAddress: safeTruncate(ipAddress, 255),
      userAgent: safeTruncate(userAgent, 512),
      expiresAt
    }
  });

  return { accessToken, refreshToken, expiresIn: 900 };
}

export async function rotateRefreshToken({ refreshToken, ipAddress, userAgent }) {
  if (!refreshToken) throw new Error('Refresh token required');
  const decoded = jwt.verify(refreshToken, JWT_SECRET);
  const jti = decoded.jti;
  if (!jti) throw new Error('Invalid refresh token');

  const record = await prisma.refreshToken.findUnique({ where: { tokenJti: jti } });
  if (!record || record.revokedAt) throw new Error('Invalid refresh token');
  if (record.expiresAt && record.expiresAt < new Date()) throw new Error('Refresh token expired');

  const matches = await bcrypt.compare(refreshToken, record.tokenHash);
  if (!matches) throw new Error('Invalid refresh token');

  const newJti = randomUUID();
  const payload = {
    user_id: decoded.user_id,
    tenant_id: decoded.tenant_id,
    email: decoded.email,
    role: decoded.role,
    user_type: decoded.user_type
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const newRefreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN, jwtid: newJti });
  const expiresAt = computeExpiryDate(newRefreshToken, 7 * 24 * 60 * 60 * 1000);
  const newHash = await bcrypt.hash(newRefreshToken, 10);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { tokenJti: jti }, data: { revokedAt: new Date(), replacedByTokenId: newJti } });
    await tx.refreshToken.create({
      data: {
        userId: payload.user_id,
        userType: payload.user_type,
        tenantId: payload.tenant_id || null,
        tokenJti: newJti,
        tokenHash: newHash,
        ipAddress: safeTruncate(ipAddress, 255),
        userAgent: safeTruncate(userAgent, 512),
        expiresAt
      }
    });
  });

  return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
}

export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return false;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (!decoded.jti) return false;
    await prisma.refreshToken.updateMany({
      where: { tokenJti: decoded.jti, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    return true;
  } catch (e) {
    return false;
  }
}
