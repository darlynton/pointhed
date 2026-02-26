import financialService from '../services/financial.service.js';

async function getDataExchange(req, res, next) {
  try {
    const { vendorId } = req.query;
    const phoneNumber = req.query.phoneNumber || req.query.phone;

    if (!vendorId && !phoneNumber) {
      return res.status(400).json({ error: 'vendorId or phoneNumber is required' });
    }

    // Determine client IP (respect X-Forwarded-For when behind proxies)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.connection?.remoteAddress);

    const payload = await financialService.buildDataExchangePayload({ vendorId, phoneNumber, ip });
    return res.json({ data_exchange: payload });
  } catch (err) {
    next(err);
  }
}

export default {
  getDataExchange,
};

export async function setHomeCurrency(req, res, next) {
  try {
    const tenantId = req.user.tenantId;
    const { homeCurrency, timezone } = req.body;
    const update = {};
    if (homeCurrency) update.homeCurrency = homeCurrency;
    if (timezone) update.timezone = timezone;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'homeCurrency or timezone required' });
    }

    const updated = await financialService.updateTenantHome(tenantId, update);
    return res.json({ message: 'Updated', tenant: updated });
  } catch (err) {
    next(err);
  }
}
