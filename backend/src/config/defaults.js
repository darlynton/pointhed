// Centralized Application Defaults
// All hardcoded values in one place for easy configuration

export const defaults = {
  // Pagination
  pagination: {
    defaultPage: 1,
    defaultLimit: 20,
    maxLimit: 100
  },
  
  // Loyalty Points
  loyalty: {
    welcomeBonusPoints: 10,
    defaultEarnRate: 1, // points per currency unit (for GBP/USD/EUR)
    ngnEarnRate: 1000   // NGN per point (fixed)
  },
  
  // Request limits
  request: {
    maxBodySize: '1mb',
    maxUploadSize: 5 * 1024 * 1024 // 5MB
  },
  
  // WhatsApp
  whatsapp: {
    messageMaxLength: 4096,
    batchSize: 100
  },
  
  // Session & Auth
  auth: {
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '7d',
    refreshTokenRetentionDays: 7
  },
  
  // Cleanup schedules (cron format)
  schedules: {
    qrCleanup: '0 3 * * *',      // 3 AM daily
    tokenCleanup: '0 4 * * *',   // 4 AM daily
    exchangeRates: '0 */6 * * *' // Every 6 hours
  },
  
  // QR codes
  qr: {
    retentionDays: 7
  },
  
  // Supported currencies
  currencies: ['NGN', 'GBP', 'USD', 'EUR']
};

// Helper to get pagination with validation
export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || defaults.pagination.defaultPage);
  const limit = Math.min(
    defaults.pagination.maxLimit,
    Math.max(1, parseInt(query.limit) || defaults.pagination.defaultLimit)
  );
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
}

// Helper to build pagination response
export function buildPaginationResponse(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };
}

export default defaults;
