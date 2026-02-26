import Decimal from 'decimal.js';
import prisma from '../utils/prisma.js';
import cron from 'node-cron';

// Config via env:
// EXCHANGE_BASE (default GBP), EXCHANGE_TARGETS (comma list), EXCHANGE_CRON (cron expr, default daily at 00:00 UTC)
const API_URL = 'https://api.exchangerate.host/latest';
const BASE = process.env.EXCHANGE_BASE || 'GBP';
const TARGETS = (process.env.EXCHANGE_TARGETS || 'NGN,USD,EUR').split(',').map(s => s.trim()).filter(Boolean);
const CRON_EXPR = process.env.EXCHANGE_CRON || '0 0 * * *';

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_EVEN });

async function fetchAndStoreRates() {
  try {
    const symbols = TARGETS.join(',');
    const url = `${API_URL}?base=${BASE}&symbols=${symbols}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Rate provider returned ${resp.status}`);
    const data = await resp.json();
    const now = new Date();

    if (!data || !data.rates) throw new Error('Invalid rate payload');

    for (const [toCurrency, rateVal] of Object.entries(data.rates)) {
      const rateStr = String(rateVal);
      // Store BASE -> toCurrency
      await prisma.exchangeRate.create({
        data: {
          fromCurrency: BASE,
          toCurrency,
          rate: rateStr,
          retrievedAt: now,
          provider: 'exchangerate.host',
        }
      });

      // Store inverse: toCurrency -> BASE
      const inv = new Decimal(1).div(rateVal).toSignificantDigits(12).toString();
      await prisma.exchangeRate.create({
        data: {
          fromCurrency: toCurrency,
          toCurrency: BASE,
          rate: inv,
          retrievedAt: now,
          provider: 'exchangerate.host',
        }
      });
    }

    console.log('Exchange rates updated:', Object.keys(data.rates).join(','));
  } catch (err) {
    console.error('Failed to fetch/store exchange rates:', err);
  }
}

let scheduledJob = null;

export function startExchangeUpdater({ runNow = true } = {}) {
  if (runNow) fetchAndStoreRates();

  // Stop previous job if running
  if (scheduledJob) {
    try { scheduledJob.stop(); } catch (e) { /* ignore */ }
    scheduledJob = null;
  }

  // Schedule with node-cron using provided expression
  try {
    scheduledJob = cron.schedule(CRON_EXPR, () => {
      fetchAndStoreRates();
    }, { timezone: 'UTC' });
    console.log(`Exchange updater scheduled with cron '${CRON_EXPR}' for base ${BASE} targets ${TARGETS.join(',')}`);
  } catch (err) {
    console.error('Failed to schedule exchange updater:', err);
  }
}

export async function triggerOnce() {
  await fetchAndStoreRates();
}

export default { startExchangeUpdater, triggerOnce };
