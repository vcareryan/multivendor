/**
 * Lightweight phone normalization for OTP + WhatsApp. For production-grade
 * parsing across all regions, back this with libphonenumber; this covers the
 * common India-first case and generic international E.164-ish input.
 */

export interface NormalizedPhone {
  e164: string; // +919876543210
  digits: string; // 919876543210
  valid: boolean;
}

export function normalizePhone(input: string, defaultCountryCode = '91'): NormalizedPhone {
  const raw = (input || '').trim();
  let digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.length === 10) {
    // Assume national number, prepend default country code.
    digits = `${defaultCountryCode}${digits}`;
  }

  const valid = /^\d{10,15}$/.test(digits);
  return { e164: `+${digits}`, digits, valid };
}
