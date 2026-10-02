import { formatMoney } from './money';
import { Locale } from './enums';
import type { OrderSummaryInput } from './types';

const LABELS: Record<Locale, Record<string, string>> = {
  [Locale.EN]: {
    newOrder: 'New Order',
    order: 'Order',
    name: 'Name',
    phone: 'Phone',
    address: 'Delivery Address',
    items: 'Items',
    total: 'Total',
    notes: 'Notes',
    date: 'Date',
    qty: 'x',
  },
  [Locale.ML]: {
    newOrder: 'പുതിയ ഓർഡർ',
    order: 'ഓർഡർ',
    name: 'പേര്',
    phone: 'ഫോൺ',
    address: 'ഡെലിവറി വിലാസം',
    items: 'ഉൽപ്പന്നങ്ങൾ',
    total: 'ആകെ തുക',
    notes: 'കുറിപ്പുകൾ',
    date: 'തീയതി',
    qty: 'x',
  },
};

/**
 * Build a human-readable WhatsApp order summary. Used by the backend to
 * generate the message that is embedded into the click-to-chat URL.
 */
export function buildOrderSummary(input: OrderSummaryInput): string {
  const t = LABELS[input.locale ?? Locale.EN];
  const lines: string[] = [];

  lines.push(`*${input.storeName}* — ${t.newOrder}`);
  lines.push(`${t.order} #${input.orderNumber}`);
  lines.push('');
  lines.push(`${t.name}: ${input.customerName}`);
  lines.push(`${t.phone}: ${input.customerPhone}`);
  if (input.deliveryAddress) {
    lines.push(`${t.address}: ${input.deliveryAddress}`);
  }
  lines.push('');
  lines.push(`*${t.items}:*`);

  for (const item of input.items) {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
    const lineTotal = item.unitPriceMinor * item.quantity;
    lines.push(
      `• ${item.name}${variant} ${t.qty}${item.quantity} — ${formatMoney(
        lineTotal,
        input.currency,
      )}`,
    );
    if (item.addons?.length) {
      for (const addon of item.addons) {
        lines.push(`    + ${addon.name} (${formatMoney(addon.priceMinor, input.currency)})`);
      }
    }
  }

  lines.push('');
  lines.push(`*${t.total}: ${formatMoney(input.totalMinor, input.currency)}*`);
  if (input.notes) {
    lines.push('');
    lines.push(`${t.notes}: ${input.notes}`);
  }
  lines.push('');
  lines.push(`${t.date}: ${input.createdAt.toLocaleString(input.locale === Locale.ML ? 'ml-IN' : 'en-IN')}`);

  return lines.join('\n');
}

/**
 * Build a wa.me click-to-chat URL. `ownerPhone` must be in international
 * format WITHOUT '+' or spaces (e.g. 919876543210).
 */
export function buildWhatsAppLink(ownerPhone: string, message: string): string {
  const digits = ownerPhone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
