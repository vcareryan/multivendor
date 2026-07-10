/**
 * Money helpers. All monetary values are stored and transported as integer
 * minor units (paise/cents) to avoid floating-point errors.
 */

export function toMinor(major: number): number {
  return Math.round(major * 100);
}

export function toMajor(minor: number): number {
  return minor / 100;
}

const CURRENCY_LOCALE: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
  AED: 'ar-AE',
};

/** Format minor units into a localized currency string. */
export function formatMoney(minor: number, currency = 'INR'): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(toMajor(minor));
}
