/**
 * Pointhed Loyalty Points Constants (v1)
 * 
 * Based on: Pointhed-loyalty-point-spec
 * 
 * Core Principles:
 * - Earn rate is FIXED per currency (not configurable)
 * - Burn rate is vendor-configurable (1%-5%)
 * - Points are always integers
 * - Currency rounding happens at redemption, not earning
 */

/**
 * EARN_UNITS: Fixed amount of currency units that earns 1 point
 * This is NOT configurable by vendors.
 * 
 * Formula: points_earned = floor(transaction_amount / EARN_UNIT)
 * 
 * Examples:
 * - £27.99 → floor(27.99 / 1) = 27 points
 * - $10.50 → floor(10.50 / 1) = 10 points  
 * - ₦9,500 → floor(9500 / 1000) = 9 points
 */
export const EARN_UNITS = {
  GBP: 1,    // £1 = 1 point
  USD: 1,    // $1 = 1 point
  EUR: 1,    // €1 = 1 point
  NGN: 1000  // ₦1000 = 1 point
};

/**
 * BURN_RATE: Percentage of earn_unit that defines point value
 * This IS configurable by vendors within min/max bounds.
 * 
 * Formula: point_value = EARN_UNIT × burn_rate
 * 
 * Examples at 1% (0.01) burn rate:
 * - GBP: 1 point = £1 × 0.01 = £0.01
 * - USD: 1 point = $1 × 0.01 = $0.01
 * - EUR: 1 point = €1 × 0.01 = €0.01
 * - NGN: 1 point = ₦1000 × 0.01 = ₦10
 * 
 * Examples at 2% (0.02) burn rate:
 * - GBP: 1 point = £1 × 0.02 = £0.02
 * - USD: 1 point = $1 × 0.02 = $0.02
 * - NGN: 1 point = ₦1000 × 0.02 = ₦20
 */
export const BURN_RATE = {
  MIN: 0.01,     // 1% - minimum burn rate
  MAX: 0.05,     // 5% - maximum burn rate (recommended cap)
  DEFAULT: 0.01  // 1% - default burn rate
};

/**
 * MINIMUM_REWARD_VALUE: Minimum monetary value for redeemable rewards
 * Vendors may increase but not reduce these minimums.
 */
export const MINIMUM_REWARD_VALUE = {
  GBP: 5,    // £5
  USD: 5,    // $5
  EUR: 5,    // €5
  NGN: 500   // ₦500
};

/**
 * DEFAULT_WELCOME_BONUS: Points awarded to new customers
 * All currencies get the same default.
 */
export const DEFAULT_WELCOME_BONUS = 10;

/**
 * CURRENCY_MINOR_UNITS: How many minor units in one major unit
 * Used for converting between storage (minor) and display (major)
 */
export const CURRENCY_MINOR_UNITS = {
  GBP: 100,  // 100 pence = £1
  USD: 100,  // 100 cents = $1
  EUR: 100,  // 100 cents = €1
  NGN: 100   // 100 kobo = ₦1
};

/**
 * Calculate points earned from a transaction
 * 
 * @param {number} amountMajor - Transaction amount in major units (e.g., 50 for £50)
 * @param {string} currency - Currency code (GBP, USD, EUR, NGN)
 * @returns {number} - Points earned (always integer, floored)
 */
export function calculatePointsEarned(amountMajor, currency) {
  const earnUnit = EARN_UNITS[currency] || EARN_UNITS.GBP;
  return Math.floor(amountMajor / earnUnit);
}

/**
 * Calculate points earned from minor units (used by backend)
 * 
 * @param {number} amountMinor - Transaction amount in minor units (e.g., 5000 for £50)
 * @param {string} currency - Currency code (GBP, USD, EUR, NGN)
 * @returns {number} - Points earned (always integer, floored)
 */
export function calculatePointsEarnedFromMinor(amountMinor, currency) {
  const minorUnits = CURRENCY_MINOR_UNITS[currency] || 100;
  const amountMajor = amountMinor / minorUnits;
  return calculatePointsEarned(amountMajor, currency);
}

/**
 * Calculate the monetary value of one point
 * 
 * @param {string} currency - Currency code (GBP, USD, EUR, NGN)
 * @param {number} burnRate - Burn rate (0.01 to 0.05)
 * @returns {number} - Value of 1 point in major currency units
 */
export function calculatePointValue(currency, burnRate = BURN_RATE.DEFAULT) {
  const earnUnit = EARN_UNITS[currency] || EARN_UNITS.GBP;
  const validBurnRate = Math.max(BURN_RATE.MIN, Math.min(BURN_RATE.MAX, burnRate));
  return earnUnit * validBurnRate;
}

/**
 * Calculate points required for a reward of given value
 * 
 * @param {number} rewardValueMajor - Reward value in major units (e.g., 10 for £10)
 * @param {string} currency - Currency code (GBP, USD, EUR, NGN)
 * @param {number} burnRate - Burn rate (0.01 to 0.05)
 * @returns {number} - Points required (always integer, ceiled)
 */
export function calculatePointsRequired(rewardValueMajor, currency, burnRate = BURN_RATE.DEFAULT) {
  const pointValue = calculatePointValue(currency, burnRate);
  if (pointValue <= 0) return Infinity;
  return Math.ceil(rewardValueMajor / pointValue);
}

/**
 * Calculate reward value from points
 * 
 * @param {number} points - Number of points to redeem
 * @param {string} currency - Currency code (GBP, USD, EUR, NGN)
 * @param {number} burnRate - Burn rate (0.01 to 0.05)
 * @returns {number} - Reward value in major currency units
 */
export function calculateRewardValue(points, currency, burnRate = BURN_RATE.DEFAULT) {
  const pointValue = calculatePointValue(currency, burnRate);
  return points * pointValue;
}

/**
 * Validate burn rate is within allowed bounds
 * 
 * @param {number} burnRate - Burn rate to validate
 * @returns {{ valid: boolean, value: number, error?: string }}
 */
export function validateBurnRate(burnRate) {
  const rate = Number(burnRate);
  if (isNaN(rate)) {
    return { valid: false, value: BURN_RATE.DEFAULT, error: 'Burn rate must be a number' };
  }
  if (rate < BURN_RATE.MIN) {
    return { valid: false, value: BURN_RATE.MIN, error: `Burn rate cannot be less than ${BURN_RATE.MIN * 100}%` };
  }
  if (rate > BURN_RATE.MAX) {
    return { valid: false, value: BURN_RATE.MAX, error: `Burn rate cannot exceed ${BURN_RATE.MAX * 100}%` };
  }
  return { valid: true, value: rate };
}

/**
 * Get earn unit for a currency
 * 
 * @param {string} currency - Currency code
 * @returns {number} - Earn unit (currency amount for 1 point)
 */
export function getEarnUnit(currency) {
  return EARN_UNITS[currency] || EARN_UNITS.GBP;
}

/**
 * Get minimum reward value for a currency
 * 
 * @param {string} currency - Currency code
 * @returns {number} - Minimum reward value in major units
 */
export function getMinimumRewardValue(currency) {
  return MINIMUM_REWARD_VALUE[currency] || MINIMUM_REWARD_VALUE.GBP;
}

export default {
  EARN_UNITS,
  BURN_RATE,
  MINIMUM_REWARD_VALUE,
  DEFAULT_WELCOME_BONUS,
  CURRENCY_MINOR_UNITS,
  calculatePointsEarned,
  calculatePointsEarnedFromMinor,
  calculatePointValue,
  calculatePointsRequired,
  calculateRewardValue,
  validateBurnRate,
  getEarnUnit,
  getMinimumRewardValue
};
