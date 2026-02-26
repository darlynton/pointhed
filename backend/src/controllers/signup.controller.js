import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma.js';
import { issueTokens } from '../services/token.service.js';

// Helper to get min reward value based on currency
const getMinRewardForCurrency = (currency) => {
  const minRewardMap = {
    NGN: 500,
    GBP: 5,
    USD: 5,
    EUR: 5
  };
  return minRewardMap[currency] || 500;
};

// Generate unique vendor code
const generateVendorCode = async () => {
  const prefix = 'VND';
  let code;
  let isUnique = false;
  
  while (!isUnique) {
    const random = Math.floor(100000 + Math.random() * 900000); // 6 digits
    code = `${prefix}${random}`;
    
    const existing = await prisma.tenant.findUnique({
      where: { vendorCode: code }
    });
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return code;
};

// Generate slug from business name
const generateSlug = async (businessName) => {
  let slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  let finalSlug = slug;
  let counter = 1;
  
  while (true) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: finalSlug }
    });
    
    if (!existing) {
      break;
    }
    
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  
  return finalSlug;
};

// Vendor Signup
export const vendorSignup = async (req, res) => {
  try {
    const {
      businessName,
      contactEmail,
      contactPhone,
      fullName,
      password,
      businessType,
      address,
      city,
      state,
      country
    } = req.body;

    // Validation
    if (!businessName || !contactEmail || !contactPhone || !fullName || !password) {
      return res.status(400).json({ 
        error: 'Business name, contact email, phone, full name, and password are required' 
      });
    }

    // Check if email already exists
    const existingUser = await prisma.vendorUser.findFirst({
      where: { email: contactEmail }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if phone already exists
    const existingTenant = await prisma.tenant.findFirst({
      where: { phoneNumber: contactPhone }
    });

    if (existingTenant) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate vendor code and slug
    const vendorCode = await generateVendorCode();
    const slug = await generateSlug(businessName);

    // Set trial period (30 days)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Create tenant and admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          businessName,
          slug,
          vendorCode,
          phoneNumber: contactPhone,
          email: contactEmail,
          address: address || null,
          subscriptionStatus: 'trial',
          trialEndsAt,
          isActive: true,
          onboardingCompleted: false,
          settings: {
            businessType: businessType || 'retail',
            city: city || null,
            state: state || null,
            country: country || 'Nigeria',
            burn_rate: 0.01,  // 1% default burn rate
            welcome_bonus_points: 10,  // Default 10 points
            min_reward_value: 500  // Default for NGN
          }
        }
      });

      // Create admin vendor user
      const vendorUser = await tx.vendorUser.create({
        data: {
          tenantId: tenant.id,
          email: contactEmail,
          passwordHash,
          fullName,
          role: 'owner',
          isActive: true
        }
      });

      return { tenant, vendorUser };
    });

    // Generate JWT tokens
    const payload = {
      user_id: result.vendorUser.id,
      tenant_id: result.tenant.id,
      email: result.vendorUser.email,
      role: result.vendorUser.role,
      user_type: 'vendor'
    };

    const { accessToken, refreshToken } = await issueTokens({
      payload,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
      user: {
        id: result.vendorUser.id,
        tenantId: result.tenant.id,
        email: result.vendorUser.email,
        role: result.vendorUser.role,
        fullName: result.vendorUser.fullName,
        tenant: {
          id: result.tenant.id,
          businessName: result.tenant.businessName,
          vendorCode: result.tenant.vendorCode
        }
      },
      message: 'Account created successfully! You have 30 days free trial.'
    });
  } catch (error) {
    console.error('Vendor signup error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// Vendor provisioning using Supabase-authenticated user
export const vendorProvisionFromSupabase = async (req, res) => {
  try {
    const supa = req.supabaseUser;
    if (!supa?.id || !supa?.email) {
      return res.status(401).json({ error: 'Supabase user not found in request' });
    }

    const {
      businessName,
      contactPhone,
      fullName,
      businessType,
      address,
      city,
      state,
      country,
      homeCurrency,
      timezone
    } = req.body || {};

    if (!businessName || !contactPhone || !fullName) {
      return res.status(400).json({ error: 'businessName, contactPhone and fullName are required' });
    }

    // If this Supabase user already provisioned, return existing profile
    const existingUser = await prisma.vendorUser.findFirst({
      where: { supabaseUserId: supa.id, deletedAt: null },
      include: { tenant: true }
    });
    if (existingUser) {
      return res.json({
        user: {
          id: existingUser.id,
          tenantId: existingUser.tenantId,
          email: existingUser.email,
          role: existingUser.role,
          fullName: existingUser.fullName,
          tenant: {
            id: existingUser.tenant.id,
            businessName: existingUser.tenant.businessName,
            vendorCode: existingUser.tenant.vendorCode
          }
        },
        message: 'Account already provisioned'
      });
    }

    // Prevent duplicate by email
    const emailExists = await prisma.vendorUser.findFirst({ where: { email: supa.email, deletedAt: null } });
    if (emailExists) {
      // Backfill supabase id and return
      const updated = await prisma.vendorUser.update({ where: { id: emailExists.id }, data: { supabaseUserId: supa.id }, include: { tenant: true } });
      return res.json({
        user: {
          id: updated.id,
          tenantId: updated.tenantId,
          email: updated.email,
          role: updated.role,
          fullName: updated.fullName,
          tenant: { id: updated.tenant.id, businessName: updated.tenant.businessName, vendorCode: updated.tenant.vendorCode }
        },
        message: 'Linked existing account to Supabase user'
      });
    }

    // Generate helper values
    const vendorCode = await generateVendorCode();
    const slug = await generateSlug(businessName);
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Use a transaction and re-check for existing users to avoid races / duplicates.
    const result = await prisma.$transaction(async (tx) => {
      // Re-check: maybe another request provisioned concurrently
      const alreadyBySupabase = await tx.vendorUser.findFirst({ where: { supabaseUserId: supa.id, deletedAt: null }, include: { tenant: true } });
      if (alreadyBySupabase) {
        return { existing: alreadyBySupabase };
      }

      const alreadyByEmail = await tx.vendorUser.findFirst({ where: { email: supa.email, deletedAt: null }, include: { tenant: true } });
      if (alreadyByEmail) {
        // Backfill supabase id safely
        const updated = await tx.vendorUser.update({ where: { id: alreadyByEmail.id }, data: { supabaseUserId: supa.id }, include: { tenant: true } });
        return { linked: updated };
      }

      const tenant = await tx.tenant.create({
        data: {
          businessName,
          slug,
          vendorCode,
          phoneNumber: contactPhone,
          email: supa.email,
          address: address || null,
          homeCurrency: homeCurrency || 'NGN',
          timezone: timezone || null,
          subscriptionStatus: 'trial',
          trialEndsAt,
          isActive: true,
          onboardingCompleted: false,
          settings: {
            businessType: businessType || 'retail',
            city: city || null,
            state: state || null,
            country: country || 'Nigeria',
            burn_rate: 0.01,  // 1% default burn rate
            welcome_bonus_points: 10,  // Default 10 points
            min_reward_value: getMinRewardForCurrency(homeCurrency || 'NGN')  // Currency-aware default
          }
        }
      });

      const vendorUser = await tx.vendorUser.create({
        data: {
          tenantId: tenant.id,
          email: supa.email,
          passwordHash: '',
          supabaseUserId: supa.id,
          fullName,
          role: 'owner',
          isActive: true
        }
      });

      return { tenant, vendorUser };
    });

    // If transaction returned existing or linked, normalize response
    if (result.existing) {
      const u = result.existing;
      return res.json({ user: { id: u.id, tenantId: u.tenantId, email: u.email, role: u.role, fullName: u.fullName, tenant: { id: u.tenant.id, businessName: u.tenant.businessName, vendorCode: u.tenant.vendorCode } }, message: 'Account already provisioned' });
    }

    if (result.linked) {
      const u = result.linked;
      return res.json({ user: { id: u.id, tenantId: u.tenantId, email: u.email, role: u.role, fullName: u.fullName, tenant: { id: u.tenant.id, businessName: u.tenant.businessName, vendorCode: u.tenant.vendorCode } }, message: 'Linked existing account to Supabase user' });
    }

    return res.status(201).json({
      user: {
        id: result.vendorUser.id,
        tenantId: result.tenant.id,
        email: result.vendorUser.email,
        role: result.vendorUser.role,
        fullName: result.vendorUser.fullName,
        tenant: {
          id: result.tenant.id,
          businessName: result.tenant.businessName,
          vendorCode: result.tenant.vendorCode
        }
      },
      message: 'Account provisioned successfully'
    });
  } catch (error) {
    console.error('Supabase provisioning error:', error);
    return res.status(500).json({ error: 'Provisioning failed' });
  }
};
