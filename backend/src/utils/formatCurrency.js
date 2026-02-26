// Format an amount stored in minor units (e.g., kobo, pence) for backend messages
export function formatCurrency(amountMinor, currency = 'NGN') {
  try {
    const map = {
      NGN: { locale: 'en-NG', minor: 100 },
      GBP: { locale: 'en-GB', minor: 100 },
      USD: { locale: 'en-US', minor: 100 },
      EUR: { locale: 'de-DE', minor: 100 }
    };

    const cfg = map[currency] || map['NGN'];
    const locale = cfg.locale;
    const minor = cfg.minor;

    // Convert minor -> major for display (e.g., 50000 pence -> 500.00 GBP)
    const amountMajor = (Number(amountMinor) || 0) / minor;
    const fractionDigits = minor === 1 ? 0 : 2;

    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(amountMajor);
  } catch (e) {
    return `${currency} ${amountMinor}`;
  }
}

export default formatCurrency;
