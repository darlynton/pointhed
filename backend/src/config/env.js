const isProduction = process.env.NODE_ENV === 'production';

const REQUIRED_ALWAYS = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const REQUIRED_IN_PROD = [
  'FRONTEND_URL',
  'WHATSAPP_VERIFY_TOKEN'
];

const missing = (keys) => keys.filter((k) => !process.env[k]);

export function validateEnv() {
  const missingVars = [...missing(REQUIRED_ALWAYS)];

  if (isProduction) {
    missingVars.push(...missing(REQUIRED_IN_PROD));

    // Supabase verification must be configured in production
    if (!process.env.SUPABASE_JWKS_URL && !process.env.SUPABASE_PROJECT_REF) {
      missingVars.push('SUPABASE_JWKS_URL or SUPABASE_PROJECT_REF');
    }

    // WhatsApp sender credentials should be provided together
    const hasApiToken = !!process.env.WHATSAPP_API_TOKEN;
    const hasPhoneId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (hasApiToken !== hasPhoneId) {
      missingVars.push('WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID (both required together)');
    }
  }

  if (missingVars.length > 0) {
    console.error(`❌ FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file or deployment configuration.');
    process.exit(1);
  }
}
