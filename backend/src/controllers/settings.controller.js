import { PrismaClient } from '@prisma/client';
import {
  EARN_UNITS,
  BURN_RATE,
  MINIMUM_REWARD_VALUE,
  DEFAULT_WELCOME_BONUS,
  getEarnUnit,
  getMinimumRewardValue,
  calculatePointValue,
  validateBurnRate
} from '../config/loyaltyConstants.js';

const prisma = new PrismaClient();

/**
 * Get tenant settings (loyalty, WhatsApp, branding, notifications)
 */
export const getSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        businessName: true,
        email: true,
        phoneNumber: true,
        address: true,
        vendorCode: true,
        settings: true,
        branding: true,
        whatsappConfig: true,
        homeCurrency: true,
        timezone: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Parse JSON fields and provide defaults
    let settings = {};
    let branding = {};
    let whatsappConfig = {};

    try {
      settings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
    } catch (e) {
      console.warn('Failed to parse settings JSON:', e);
      settings = {};
    }

    try {
      branding = typeof tenant.branding === 'string' ? JSON.parse(tenant.branding) : (tenant.branding || {});
    } catch (e) {
      console.warn('Failed to parse branding JSON:', e);
      branding = {};
    }

    try {
      whatsappConfig = typeof tenant.whatsappConfig === 'string' ? JSON.parse(tenant.whatsappConfig) : (tenant.whatsappConfig || {});
    } catch (e) {
      console.warn('Failed to parse whatsappConfig JSON:', e);
      whatsappConfig = {};
    }

    // Return structured settings
    const currency = tenant.homeCurrency || 'NGN';
    const earnUnit = getEarnUnit(currency);
    const defaultMinReward = getMinimumRewardValue(currency);
    const burnRate = settings.burn_rate ?? BURN_RATE.DEFAULT;
    const pointValue = calculatePointValue(currency, burnRate);

    res.json({
      business: {
        name: tenant.businessName,
        email: tenant.email,
        phone: tenant.phoneNumber,
        address: tenant.address,
        vendorCode: tenant.vendorCode,
        homeCurrency: currency,
        timezone: tenant.timezone || null,
      },
      loyalty: {
        // Fixed earn rate (not configurable)
        earnUnit,  // e.g., 1000 for NGN, 1 for GBP
        
        // Configurable burn rate (1%-5%)
        burnRate,
        burnRateMin: BURN_RATE.MIN,
        burnRateMax: BURN_RATE.MAX,
        
        // Calculated point value for display
        pointValue,  // e.g., 10 for NGN at 1%, 0.01 for GBP at 1%
        
        // Welcome bonus
        welcomeBonusEnabled: settings.welcome_bonus_enabled ?? true,
        welcomeBonusPoints: settings.welcome_bonus_points ?? DEFAULT_WELCOME_BONUS,
        
        // Minimum reward value
        minRewardValue: settings.min_reward_value ?? defaultMinReward,
        minRewardValueDefault: defaultMinReward,
        
        // Legacy fields (for backward compatibility during migration)
        pointsPerNaira: settings.points_per_naira ?? 1,
        majorUnitsPerPoint: earnUnit,
        minRewardValueMajor: settings.min_reward_value ?? defaultMinReward,
        minimumPurchase: settings.minimum_purchase ?? earnUnit,
        
        // Expiry settings
        pointsExpiryEnabled: settings.points_expiry_enabled ?? false,
        pointsExpiryDays: settings.points_expiry_days ?? 365,
        pointsExpiryUnit: settings.points_expiry_unit ?? 'days',
      },
      whatsapp: {
        purchaseMessage: whatsappConfig.purchase_message ?? '🛍️ Purchase Confirmed! You earned {points} points. New balance: {balance} points',
        autoReplyEnabled: whatsappConfig.auto_reply_enabled ?? true,
      },
      notifications: {
        notifyPurchase: settings.notify_purchase ?? true,
        notifyRedemption: settings.notify_redemption ?? true,
        notifyExpiry: settings.notify_expiry ?? true,
        expiryReminderDays: settings.expiry_reminder_days ?? 7,
        notifyMilestone: settings.notify_milestone ?? true,
        notifyNewClaims: settings.notify_new_claims ?? true,
      },
      branding: {
        primaryColor: branding.primary_color ?? '#2563eb',
        logoUrl: branding.logo_url ?? '',
      },
      advanced: {
        testMode: settings.test_mode ?? false,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

/**
 * Update tenant settings
 */
export const updateSettings = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    console.log('Updating settings for tenant:', tenantId);
    const { business, loyalty, whatsapp, notifications, branding } = req.body;

    // Build update data
    const updateData = {};

    // Validate loyalty inputs if provided
    if (loyalty && loyalty.majorUnitsPerPoint !== undefined) {
      const v = Number(loyalty.majorUnitsPerPoint);
      if (!Number.isFinite(v) || v < 1) {
        return res.status(400).json({ error: 'Invalid value for majorUnitsPerPoint. Must be a number >= 1.' });
      }
    }
    if (loyalty && loyalty.minRewardValueMajor !== undefined && loyalty.minRewardValueMajor !== null) {
      const v = Number(loyalty.minRewardValueMajor);
      if (!Number.isFinite(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid value for minRewardValueMajor. Must be a number >= 0.' });
      }
    }

    // Update business info
    if (business) {
      if (business.name) updateData.businessName = business.name;
      if (business.email) updateData.email = business.email;
      if (business.phone) updateData.phoneNumber = business.phone;
      if (business.address) updateData.address = business.address;
      if (business.vendorCode) updateData.vendorCode = business.vendorCode;
      if (business.homeCurrency !== undefined) updateData.homeCurrency = business.homeCurrency || null;
      if (business.timezone !== undefined) updateData.timezone = business.timezone || null;
    }

    // Get current settings to merge
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        settings: true,
        branding: true,
        whatsappConfig: true,
      },
    });

    let currentSettings = {};
    let currentBranding = {};
    let currentWhatsappConfig = {};

    try {
      currentSettings = typeof currentTenant.settings === 'string' ? JSON.parse(currentTenant.settings) : (currentTenant.settings || {});
    } catch (e) {
      console.warn('Failed to parse current settings JSON:', e);
      currentSettings = {};
    }

    try {
      currentBranding = typeof currentTenant.branding === 'string' ? JSON.parse(currentTenant.branding) : (currentTenant.branding || {});
    } catch (e) {
      console.warn('Failed to parse current branding JSON:', e);
      currentBranding = {};
    }

    try {
      currentWhatsappConfig = typeof currentTenant.whatsappConfig === 'string' ? JSON.parse(currentTenant.whatsappConfig) : (currentTenant.whatsappConfig || {});
    } catch (e) {
      console.warn('Failed to parse current whatsappConfig JSON:', e);
      currentWhatsappConfig = {};
    }

    // Update loyalty settings
    if (loyalty) {
      // Validate and save burn rate
      let validatedBurnRate = undefined;
      if (loyalty.burnRate !== undefined) {
        const validation = validateBurnRate(loyalty.burnRate);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }
        validatedBurnRate = validation.value;
      }

      // Get currency for fixed earn unit
      const homeCurrency = business?.homeCurrency ?? currentTenant.homeCurrency ?? 'NGN';
      const earnUnit = getEarnUnit(homeCurrency);
      const minRewardValueDefault = getMinimumRewardValue(homeCurrency);

      // Validate min_reward_value if provided
      let validatedMinRewardValue;
      const rawMinRewardValue = loyalty.minRewardValue ?? loyalty.minRewardValueMajor;
      if (rawMinRewardValue !== undefined && rawMinRewardValue !== null) {
        const val = Number(rawMinRewardValue);
        if (!Number.isFinite(val) || val < minRewardValueDefault) {
          return res.status(400).json({
            error: `Minimum reward value must be at least ${minRewardValueDefault} ${homeCurrency}`,
            providedValue: rawMinRewardValue,
            minimumAllowed: minRewardValueDefault
          });
        }
        validatedMinRewardValue = val;
      }

      updateData.settings = {
        ...currentSettings,
        // New burn_rate field
        ...(validatedBurnRate !== undefined && { burn_rate: validatedBurnRate }),
        
        // Welcome bonus
        ...(loyalty.welcomeBonusEnabled !== undefined && { welcome_bonus_enabled: loyalty.welcomeBonusEnabled }),
        ...(loyalty.welcomeBonusPoints !== undefined && { welcome_bonus_points: Number(loyalty.welcomeBonusPoints) }),
        
        // Minimum reward value (validated)
        ...(validatedMinRewardValue !== undefined && { min_reward_value: validatedMinRewardValue }),
        
        // Points expiry
        ...(loyalty.pointsExpiryEnabled !== undefined && { points_expiry_enabled: loyalty.pointsExpiryEnabled }),
        ...(loyalty.pointsExpiryDays !== undefined && { points_expiry_days: Number(loyalty.pointsExpiryDays) }),
        ...(loyalty.pointsExpiryUnit !== undefined && { points_expiry_unit: loyalty.pointsExpiryUnit }),
        
        // Legacy fields (kept for backward compatibility)
        ...(loyalty.pointsPerNaira !== undefined && { points_per_naira: Number(loyalty.pointsPerNaira) }),
        ...(loyalty.minimumPurchase !== undefined && { minimum_purchase: Number(loyalty.minimumPurchase) }),
        
        // Always store the fixed earn unit based on currency
        major_units_per_point: earnUnit,
      };
    }

    // Update notification settings
    if (notifications) {
      const existingSettings = updateData.settings || currentSettings;
      updateData.settings = {
        ...existingSettings,
        ...(notifications.notifyPurchase !== undefined && { notify_purchase: notifications.notifyPurchase }),
        ...(notifications.notifyRedemption !== undefined && { notify_redemption: notifications.notifyRedemption }),
        ...(notifications.notifyExpiry !== undefined && { notify_expiry: notifications.notifyExpiry }),
        ...(notifications.expiryReminderDays !== undefined && { expiry_reminder_days: Number(notifications.expiryReminderDays) }),
        ...(notifications.notifyMilestone !== undefined && { notify_milestone: notifications.notifyMilestone }),
        ...(notifications.notifyNewClaims !== undefined && { notify_new_claims: notifications.notifyNewClaims }),
      };
    }

    // Update WhatsApp config
    if (whatsapp) {
      // Validate message lengths (reasonable limits for WhatsApp)
      if (whatsapp.purchaseMessage !== undefined) {
        if (whatsapp.purchaseMessage.length > 300) {
          return res.status(400).json({
            error: 'Purchase message is too long. Maximum 300 characters allowed.',
            currentLength: whatsapp.purchaseMessage.length,
            maxLength: 300
          });
        }
      }

      updateData.whatsappConfig = {
        ...currentWhatsappConfig,
        ...(whatsapp.purchaseMessage !== undefined && { purchase_message: whatsapp.purchaseMessage }),
        ...(whatsapp.autoReplyEnabled !== undefined && { auto_reply_enabled: whatsapp.autoReplyEnabled }),
      };
    }

    // Update branding
    if (branding) {
      updateData.branding = {
        ...currentBranding,
        ...(branding.primaryColor !== undefined && { primary_color: branding.primaryColor }),
        ...(branding.logoUrl !== undefined && { logo_url: branding.logoUrl }),
      };
    }

    // Update advanced settings (testMode)
    const { advanced } = req.body;
    if (advanced) {
      const existingSettings = updateData.settings || currentSettings;
      updateData.settings = {
        ...existingSettings,
        ...(advanced.testMode !== undefined && { test_mode: advanced.testMode }),
      };
    }

    // Update tenant
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        businessName: true,
        email: true,
        phoneNumber: true,
        address: true,
        vendorCode: true,
        settings: true,
        branding: true,
        whatsappConfig: true,
        homeCurrency: true,
        timezone: true,
      },
    });

    // Return formatted response
    let settings = {};
    let brandingData = {};
    let whatsappConfigData = {};

    try {
      settings = typeof updatedTenant.settings === 'string' ? JSON.parse(updatedTenant.settings) : (updatedTenant.settings || {});
    } catch (e) {
      console.warn('Failed to parse updated settings JSON:', e);
      settings = {};
    }

    try {
      brandingData = typeof updatedTenant.branding === 'string' ? JSON.parse(updatedTenant.branding) : (updatedTenant.branding || {});
    } catch (e) {
      console.warn('Failed to parse updated branding JSON:', e);
      brandingData = {};
    }

    try {
      whatsappConfigData = typeof updatedTenant.whatsappConfig === 'string' ? JSON.parse(updatedTenant.whatsappConfig) : (updatedTenant.whatsappConfig || {});
    } catch (e) {
      console.warn('Failed to parse updated whatsappConfig JSON:', e);
      whatsappConfigData = {};
    }

    const defaultMinRewardValueMajor = (() => {
      const currency = updatedTenant.homeCurrency || (settings.currency || 'NGN');
      // Per spec: GBP/USD/EUR = 5, NGN = 500
      const map = {
        NGN: 500,
        GBP: 5,
        USD: 5,
        EUR: 5
      };
      return map[currency] ?? 5;
    })();

    res.json({
      message: 'Settings updated successfully',
      settings: {
        business: {
          name: updatedTenant.businessName,
          email: updatedTenant.email,
          phone: updatedTenant.phoneNumber,
          address: updatedTenant.address,
          vendorCode: updatedTenant.vendorCode,
          homeCurrency: updatedTenant.homeCurrency || null,
          timezone: updatedTenant.timezone || null,
        },
        loyalty: {
          welcomeBonusEnabled: settings.welcome_bonus_enabled ?? true,
          welcomeBonusPoints: settings.welcome_bonus_points ?? 50,
          pointsPerNaira: settings.points_per_naira ?? 1,
          majorUnitsPerPoint: (
            settings.major_units_per_point ?? settings.majorUnitsPerPoint ?? (
              updatedTenant.homeCurrency === 'NGN' ? 1000 : 1
            )
          ),
          minRewardValueMajor: (
            settings.min_reward_value_major ?? settings.minRewardValueMajor ?? defaultMinRewardValueMajor
          ),
          minimumPurchase: settings.minimum_purchase ?? 1000,
          pointsExpiryEnabled: settings.points_expiry_enabled ?? false,
          pointsExpiryDays: settings.points_expiry_days ?? 365,
          pointsExpiryUnit: settings.points_expiry_unit ?? 'days',
        },
        whatsapp: {
          purchaseMessage: whatsappConfigData.purchase_message ?? '',
          autoReplyEnabled: whatsappConfigData.auto_reply_enabled ?? true,
        },
        notifications: {
          notifyPurchase: settings.notify_purchase ?? true,
          notifyRedemption: settings.notify_redemption ?? true,
          notifyExpiry: settings.notify_expiry ?? true,
          expiryReminderDays: settings.expiry_reminder_days ?? 7,
          notifyMilestone: settings.notify_milestone ?? true,
          notifyNewClaims: settings.notify_new_claims ?? true,
        },
        branding: {
          primaryColor: brandingData.primary_color ?? '#2563eb',
          logoUrl: brandingData.logo_url ?? '',
        },
        advanced: {
          testMode: settings.test_mode ?? false,
        },
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Update business details during onboarding
 */
export const updateBusinessDetails = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { businessType, address, city, state } = req.body;

    if (!businessType || !address || !city) {
      return res.status(400).json({ error: 'businessType, address, and city are required' });
    }

    // Get current settings
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    let settings = {};
    try {
      settings = typeof currentTenant.settings === 'string' 
        ? JSON.parse(currentTenant.settings) 
        : (currentTenant.settings || {});
    } catch (e) {
      settings = {};
    }

    // Update settings with business details
    settings.businessType = businessType;
    settings.city = city;
    settings.state = state || null;
    settings.country = settings.country || 'Nigeria'; // preserve existing country

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        address,
        settings: settings,
      },
    });

    res.json({ message: 'Business details updated successfully', tenant: updated });
  } catch (error) {
    console.error('Error updating business details:', error);
    res.status(500).json({ error: 'Failed to update business details' });
  }
};

/**
 * Update WhatsApp configuration during onboarding
 */
export const updateWhatsAppConfig = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { enabled, businessId, accessToken, phoneNumberId } = req.body;

    if (enabled && (!businessId || !accessToken || !phoneNumberId)) {
      return res.status(400).json({ 
        error: 'businessId, accessToken, and phoneNumberId are required when WhatsApp is enabled' 
      });
    }

    // Get current whatsapp config
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappConfig: true },
    });

    let whatsappConfig = {};
    try {
      whatsappConfig = typeof currentTenant.whatsappConfig === 'string' 
        ? JSON.parse(currentTenant.whatsappConfig) 
        : (currentTenant.whatsappConfig || {});
    } catch (e) {
      whatsappConfig = {};
    }

    // Update WhatsApp config
    if (enabled) {
      whatsappConfig.enabled = true;
      whatsappConfig.business_id = businessId;
      whatsappConfig.access_token = accessToken;
      whatsappConfig.phone_number_id = phoneNumberId;
    } else {
      whatsappConfig.enabled = false;
    }

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappConfig: whatsappConfig,
      },
    });

    res.json({ message: 'WhatsApp configuration updated successfully' });
  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp configuration' });
  }
};

/**
 * Mark onboarding as completed
 */
export const completeOnboarding = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { onboardingCompleted } = req.body;

    if (typeof onboardingCompleted !== 'boolean') {
      return res.status(400).json({ error: 'onboardingCompleted must be a boolean' });
    }

    // Update tenant onboarding status
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        onboardingCompleted,
      },
    });

    res.json({ 
      message: 'Onboarding status updated successfully', 
      onboardingCompleted: updated.onboardingCompleted 
    });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    res.status(500).json({ error: 'Failed to update onboarding status' });
  }
};
