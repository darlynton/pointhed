import Decimal from 'decimal.js';
import prisma from '../utils/prisma.js';

// Use Banker's Rounding (Round half to even) globally in this module
Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

const DEFAULT_PRECISION = 2;

async function getLatestRate(fromCurrency, toCurrency) {
  if (!fromCurrency || !toCurrency) throw new Error('Missing currency codes');
  if (fromCurrency === toCurrency) return new Decimal(1);

  const rateRow = await prisma.exchangeRate.findFirst({
    where: { fromCurrency, toCurrency },
    orderBy: { retrievedAt: 'desc' },
  });

  if (!rateRow) {
    throw new Error(`No exchange rate available for ${fromCurrency}->${toCurrency}`);
  }

  return new Decimal(rateRow.rate);
}

/**
 * Convert an amount from one currency to another using cached exchange rates.
 * Returns an object with `amount` (string), `rate` (string) and `precision` (int).
 */
async function convert(amount, fromCurrency, toCurrency, precision = DEFAULT_PRECISION) {
  const decAmount = new Decimal(amount);
  const rate = await getLatestRate(fromCurrency, toCurrency);
  const converted = decAmount.mul(rate);

  // Banker rounding to specified precision
  const rounded = converted.toDecimalPlaces(precision, Decimal.ROUND_HALF_EVEN);

  return {
    amount: rounded.toFixed(precision),
    rate: rate.toString(),
    precision,
  };
}

/**
 * Store a new exchange rate (used by a daily updater or admin job).
 * `rate` should be a string or number representing numeric rate (toCurrency per 1 fromCurrency).
 */
async function storeRate(fromCurrency, toCurrency, rate, provider = null, metadata = {}) {
  const now = new Date();
  return prisma.exchangeRate.create({
    data: {
      fromCurrency,
      toCurrency,
      rate: rate.toString(),
      retrievedAt: now,
      provider,
      metadata,
    },
  });
}

export default {
  convert,
  getLatestRate,
  storeRate,
};
