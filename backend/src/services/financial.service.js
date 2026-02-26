import prisma from '../utils/prisma.js';
import currencyConverter from './currencyConverter.js';

// Minimal mapping for currency symbols and decimal precision.
const CURRENCY_META = {
  NGN: { symbol: '₦', precision: 2 },
  GBP: { symbol: '£', precision: 2 },
  USD: { symbol: '$', precision: 2 },
  EUR: { symbol: '€', precision: 2 },
};

function symbolFor(code) {
  return (CURRENCY_META[code] && CURRENCY_META[code].symbol) || code;
}

function precisionFor(code) {
  return (CURRENCY_META[code] && CURRENCY_META[code].precision) ?? 2;
}

/**
 * Detect vendor locale by vendorId or phoneNumber.
 * If vendorId is present, prefer the tenant's `homeCurrency` and `timezone`.
 * For phone numbers, use a small prefix map.
 */
async function detectLocale({ vendorId, phoneNumber, ip }) {
  if (vendorId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: vendorId } });
    if (tenant) {
      // Prefer explicit `homeCurrency`, otherwise fall back to settings.currency if present
      let settingsCurrency = 'NGN';
      try {
        const s = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        if (s && s.currency) settingsCurrency = s.currency;
      } catch (e) {
        // ignore parse errors
      }

      return {
        currency_code: tenant.homeCurrency || settingsCurrency || 'NGN',
        timezone: tenant.timezone || 'UTC',
      };
    }
  }

  // If an IP address is provided, attempt GeoIP lookup first (best-effort)
  if (!vendorId && ip) {
    try {
      // Use ipapi.co for free JSON lookups: currency and timezone fields
      const ipToUse = ip === '::1' || ip === '127.0.0.1' ? '' : ip;
      const url = ipToUse ? `https://ipapi.co/${ipToUse}/json/` : `https://ipapi.co/json/`;
      const resp = await fetch(url, { timeout: 3000 });
      if (resp && resp.ok) {
        const body = await resp.json();
        if (body && (body.currency || body.timezone)) {
          return {
            currency_code: (body.currency || 'GBP').toUpperCase(),
            timezone: body.timezone || 'UTC',
          };
        }
      }
    } catch (e) {
      // GeoIP lookup failed; fall through to phoneNumber-based detection
      console.warn('GeoIP lookup failed:', e?.message || e);
    }
  }

  if (phoneNumber) {
    const pn = phoneNumber.replace(/\s|-/g, '');
    if (pn.startsWith('+44') || pn.startsWith('44')) return { currency_code: 'GBP', timezone: 'Europe/London' };
    if (pn.startsWith('+234') || pn.startsWith('234')) return { currency_code: 'NGN', timezone: 'Africa/Lagos' };
    if (pn.startsWith('+1') || pn.startsWith('1')) return { currency_code: 'USD', timezone: 'America/New_York' };
  }

  return { currency_code: 'GBP', timezone: 'UTC' };
}

/**
 * Build the data_exchange payload required by the caller.
 */
async function buildDataExchangePayload({ vendorId, phoneNumber }) {
  const locale = await detectLocale({ vendorId, phoneNumber });
  const currency_code = (locale.currency_code || 'GBP').toUpperCase();
  const payload = {
    currency_code,
    currency_symbol: symbolFor(currency_code),
    decimal_precision: precisionFor(currency_code),
    timezone: locale.timezone || 'UTC',
  };

  return payload;
}

async function updateTenantHome(tenantId, update) {
  const updated = await prisma.tenant.update({ where: { id: tenantId }, data: update });
  return updated;
}

export default {
  detectLocale,
  buildDataExchangePayload,
  currencyConverter,
  updateTenantHome,
};
