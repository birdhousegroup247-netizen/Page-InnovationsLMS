/**
 * Currency formatting that respects the currency stored on the payment.
 *
 * Historically the admin UI hardcoded `$` even though `payments.currency`
 * was already being stored — any non-USD payment (mid-deploy provider
 * switch, manual DB row, NGN-enabled Paystack account) would render
 * with the wrong symbol.
 *
 * Uses Intl.NumberFormat when available so we get proper locale-aware
 * grouping and the right symbol per currency. Falls back to `$` if the
 * currency code is unknown or Intl trips (very old browsers).
 */

const SYMBOL_FALLBACK = {
  USD: '$',
  NGN: '₦',
  EUR: '€',
  GBP: '£',
  KES: 'KSh',
  GHS: '₵',
  ZAR: 'R',
};

export function formatCurrency(value, currency = 'USD') {
  const num = parseFloat(value || 0);
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch (_) {
    const sym = SYMBOL_FALLBACK[code] || '$';
    return `${sym}${num.toFixed(2)}`;
  }
}

export function formatPaymentAmount(payment, field = 'amount') {
  return formatCurrency(payment?.[field], payment?.currency || 'USD');
}
