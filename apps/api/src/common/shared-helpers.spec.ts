import {
  buildOrderSummary,
  buildWhatsAppLink,
  formatMoney,
  Locale,
  normalizePhone,
  PLAN_LIMITS,
  PlanTier,
  toMajor,
  toMinor,
} from '@utanstore/shared';

describe('money helpers', () => {
  it('converts between major and minor units', () => {
    expect(toMinor(49.5)).toBe(4950);
    expect(toMajor(4950)).toBe(49.5);
    expect(toMinor(0.1)).toBe(10);
  });

  it('formats INR currency', () => {
    const s = formatMoney(52000, 'INR');
    expect(s).toContain('520'); // ₹520.00
  });
});

describe('phone normalization', () => {
  it('prepends the default country code for 10-digit national numbers', () => {
    const p = normalizePhone('9876543210');
    expect(p.digits).toBe('919876543210');
    expect(p.e164).toBe('+919876543210');
    expect(p.valid).toBe(true);
  });

  it('handles +country and 00 prefixes and strips separators', () => {
    expect(normalizePhone('+91 98765 43210').digits).toBe('919876543210');
    expect(normalizePhone('0091-9876543210').digits).toBe('919876543210');
  });

  it('flags invalid numbers', () => {
    expect(normalizePhone('123').valid).toBe(false);
  });
});

describe('WhatsApp order summary', () => {
  const base = {
    storeName: 'FreshMart',
    orderNumber: '260709-AB12',
    customerName: 'Anish',
    customerPhone: '919876543210',
    deliveryAddress: 'MG Road, Kochi',
    items: [
      { productId: 'p1', name: 'Tomatoes', quantity: 2, unitPriceMinor: 3500 },
      { productId: 'p2', variantId: 'v1', name: 'Shirt', variantLabel: 'L / Red', quantity: 1, unitPriceMinor: 79900, addons: [{ name: 'Gift wrap', priceMinor: 5000 }] },
    ],
    totalMinor: 91900,
    currency: 'INR',
    notes: 'Ring the bell',
    createdAt: new Date('2026-07-09T10:00:00Z'),
    locale: Locale.EN,
  };

  it('includes store, order, customer, items and total', () => {
    const msg = buildOrderSummary(base);
    expect(msg).toContain('FreshMart');
    expect(msg).toContain('260709-AB12');
    expect(msg).toContain('Anish');
    expect(msg).toContain('Tomatoes');
    expect(msg).toContain('L / Red');
    expect(msg).toContain('Gift wrap');
    expect(msg).toContain('Ring the bell');
  });

  it('builds a valid wa.me link with an encoded message', () => {
    const link = buildWhatsAppLink('+91 98765 43210', 'hello world & more');
    expect(link.startsWith('https://wa.me/919876543210?text=')).toBe(true);
    expect(link).toContain('hello%20world');
    expect(link).not.toContain(' ');
  });

  it('renders a Malayalam summary when locale is ml', () => {
    const msg = buildOrderSummary({ ...base, locale: Locale.ML });
    expect(msg).toContain('ഓർഡർ');
  });
});

describe('plan limits', () => {
  it('FREE is the most restrictive, ENTERPRISE is unlimited', () => {
    expect(PLAN_LIMITS[PlanTier.FREE].customDomain).toBe(false);
    expect(PLAN_LIMITS[PlanTier.ENTERPRISE].maxProducts).toBe(-1);
    expect(PLAN_LIMITS[PlanTier.BASIC].onlinePayments).toBe(true);
  });
});
