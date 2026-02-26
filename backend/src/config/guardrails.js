// Centralized guardrail thresholds for loyalty settings
// Values can be overridden via environment variables per-currency

const toNumber = (val, fallback) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

export const guardrailThresholds = {
  NGN: toNumber(process.env.GUARDRAIL_LOW_NGN, 100),
  GBP: toNumber(process.env.GUARDRAIL_LOW_GBP, 0.01),
  USD: toNumber(process.env.GUARDRAIL_LOW_USD, 0.01),
  EUR: toNumber(process.env.GUARDRAIL_LOW_EUR, 0.01),
};

export const guardrailUpper = {
  NGN: toNumber(process.env.GUARDRAIL_HIGH_NGN, 1000),
  GBP: toNumber(process.env.GUARDRAIL_HIGH_GBP, 5),
  USD: toNumber(process.env.GUARDRAIL_HIGH_USD, 5),
  EUR: toNumber(process.env.GUARDRAIL_HIGH_EUR, 5),
};

export const minPurchaseThresholds = {
  NGN: toNumber(process.env.MIN_PURCHASE_NGN, 100),
  GBP: toNumber(process.env.MIN_PURCHASE_GBP, 1),
  USD: toNumber(process.env.MIN_PURCHASE_USD, 1),
  EUR: toNumber(process.env.MIN_PURCHASE_EUR, 1),
};

export default {
  guardrailThresholds,
  guardrailUpper,
  minPurchaseThresholds,
};
