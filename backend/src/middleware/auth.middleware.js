import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

let supabaseJWKS = null;
function getSupabaseJWKS() {
  // Prefer explicit JWKS URL, otherwise use project's .well-known JWKS path
  let jwksUrl = process.env.SUPABASE_JWKS_URL || (process.env.SUPABASE_PROJECT_REF ? `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1/.well-known/jwks.json` : null);
  if (!jwksUrl) return null;
  try {
    const urlObj = new URL(jwksUrl);
    // If an anon key is provided, include it as apikey query param so Supabase returns the keys
    if (process.env.SUPABASE_ANON_KEY) {
      urlObj.searchParams.set('apikey', process.env.SUPABASE_ANON_KEY);
    }
    if (!supabaseJWKS) supabaseJWKS = createRemoteJWKSet(urlObj);
    return supabaseJWKS;
  } catch (e) {
    return null;
  }
}

async function verifySupabaseToken(token) {
  const jwks = getSupabaseJWKS();
  if (!jwks) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      // issuer is typically https://<ref>.supabase.co/auth/v1
      // we avoid strict check to support local/staging; rely on JWKS signature instead
      // Supabase can sign tokens using RS256 or ES256 depending on configuration
      algorithms: ['RS256', 'ES256']
    });
    return payload; // contains sub (user id), email, etc.
  } catch (e) {
    return null;
  }
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    // 1) Try Supabase verification first
    const supaClaims = await verifySupabaseToken(token);
    if (supaClaims) {
      const supabaseUserId = supaClaims.sub;
      const email = supaClaims.email;
      // Attempt to find mapped vendor user by supabase id
      let userRecord = await prisma.vendorUser.findFirst({ where: { supabaseUserId, isActive: true, deletedAt: null }, include: { tenant: { select: { id: true, isActive: true } } } });
      if (!userRecord && email) {
        // Migration fallback: map by email, then backfill supabase_user_id
        const byEmail = await prisma.vendorUser.findFirst({ where: { email, isActive: true, deletedAt: null } });
        if (byEmail) {
          userRecord = await prisma.vendorUser.update({ where: { id: byEmail.id }, data: { supabaseUserId } , include: { tenant: { select: { id: true, isActive: true } } } });
        }
      }

      if (!userRecord) {
        // Not provisioned yet for app DB; block normal routes
        return res.status(403).json({ 
          error: 'Account setup incomplete', 
          message: 'Your account needs to be set up. Please check your email for the confirmation link.',
          code: 'USER_NOT_PROVISIONED',
          help: {
            steps: [
              'Check your email inbox for a confirmation link from Supabase',
              'Click the confirmation link to complete setup',
              'If you don\'t see the email, check your spam folder',
              'Still having issues? Contact support@pointhed.com'
            ],
            emailConfirmed: !!email
          }
        });
      }
      if (!userRecord.tenant?.isActive) {
        return res.status(403).json({ error: 'Tenant is inactive' });
      }

      req.user = {
        id: userRecord.id,
        tenantId: userRecord.tenantId,
        role: userRecord.role,
        email: userRecord.email,
        userType: 'vendor'
      };
      return next();
    }

    // 2) Fallback to legacy JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.user_id || decoded.userId,
      tenantId: decoded.tenant_id || decoded.tenantId,
      role: decoded.role,
      email: decoded.email,
      userType: decoded.user_type || decoded.userType || 'vendor'
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to set tenant context in Prisma (for RLS-like behavior)
export const setTenantContext = async (req, res, next) => {
  if (req.user && req.user.tenantId) {
    req.tenantId = req.user.tenantId;
  }
  next();
};

// Role-based authorization
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Admin-only routes
export const adminOnly = authorize('owner', 'admin');

// Platform admin routes
export const platformAdminOnly = (req, res, next) => {
  if (!req.user || req.user.userType !== 'platform_admin') {
    return res.status(403).json({ error: 'Platform admin access required' });
  }
  next();
};

// Supabase-auth only (no app user required) — for provisioning flows
export const authenticateSupabase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.substring(7);
    const supaClaims = await verifySupabaseToken(token);
    if (!supaClaims) return res.status(401).json({ error: 'Invalid Supabase token' });
    req.supabaseUser = { id: supaClaims.sub, email: supaClaims.email };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Supabase authentication failed' });
  }
};
