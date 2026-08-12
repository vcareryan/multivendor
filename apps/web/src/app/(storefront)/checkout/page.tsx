'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useCart } from '@/lib/cart-store';
import { useCustomer } from '@/lib/customer-store';
import { formatMoney } from '@/lib/format';
import { normalizePhone, type StorefrontConfig } from '@utanstore/shared';

type Channel = 'WHATSAPP' | 'PAY_NOW';

interface Quote {
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  currency: string;
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear, subtotalMinor } = useCart();
  const { session } = useCustomer();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [channel, setChannel] = useState<Channel>('WHATSAPP');
  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerEmail: '', deliveryAddress: '', notes: '', couponCode: '' });
  const [otp, setOtp] = useState('');
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [step, setStep] = useState<'form' | 'processing'>('form');
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => setMounted(true), []);

  // Prefill the form from the signed-in customer session.
  useEffect(() => {
    if (!session) return;
    setForm((f) => ({
      ...f,
      customerName: f.customerName || session.customer.name || '',
      customerPhone: f.customerPhone || session.customer.phone || '',
      customerEmail: f.customerEmail || session.customer.email || '',
    }));
  }, [session]);

  useEffect(() => {
    api.get<StorefrontConfig>('/store/config').then((c) => {
      setConfig(c);
      if (c.checkout.mode === 'PAYMENT_ONLY') setChannel('PAY_NOW');
      else if (c.checkout.mode === 'WHATSAPP_ONLY') setChannel('WHATSAPP');
      else setChannel((c.checkout.mode === 'BOTH' && 'WHATSAPP') || 'WHATSAPP');
    }).catch(() => setError('Could not load store'));
  }, []);

  const cartPayload = items.map((i) => ({ productId: i.productId, variantId: i.variantId ?? undefined, quantity: i.quantity, addonIds: i.addonIds }));
  // OTP is shown ONLY when the store's "Require OTP before entering address"
  // setting is on — exactly mirroring the admin toggle, for both channels.
  const requireOtp = !!config && config.checkout.requireOtpBeforeAddress;

  if (!config) return <p className="py-12 text-center text-[rgb(var(--color-muted))]">Loading…</p>;
  if (items.length === 0 && step === 'form') return <p className="py-12 text-center">Your cart is empty.</p>;

  const mode = config.checkout.mode;
  const showChoice = mode === 'BOTH';

  // Validate the phone for BOTH channels (WhatsApp order links + Pay Now +
  // OTP all rely on a real, dial-able number).
  const phoneValid = normalizePhone(form.customerPhone).valid;
  const showPhoneError = form.customerPhone.trim().length > 0 && !phoneValid;

  async function sendOtp() {
    setError(null);
    try {
      await api.post('/checkout/send-otp', { phone: form.customerPhone, purpose: 'CHECKOUT' });
      setOtpSent(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function verifyOtp() {
    setError(null);
    try {
      const res = await api.post<{ otpToken: string }>('/checkout/verify-otp', { phone: form.customerPhone, code: otp, purpose: 'CHECKOUT' });
      setOtpToken(res.otpToken);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function placeOrder() {
    setError(null);
    setStep('processing');
    try {
      const payload = {
        channel,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
        notes: form.notes || undefined,
        couponCode: form.couponCode || undefined,
        items: cartPayload,
        otpToken: otpToken || undefined,
        customerToken: session?.token || undefined,
        locale: config!.store.defaultLocale,
      };
      const res = await api.post<{ order: { id: string }; channel: Channel; waLink?: string; payment?: Record<string, unknown> }>('/checkout/create-order', payload);

      if (res.channel === 'WHATSAPP' && res.waLink) {
        clear();
        window.location.href = res.waLink;
        return;
      }
      if (res.channel === 'PAY_NOW' && res.payment) {
        await handlePayment(res.payment, res.order.id);
        return;
      }
      router.push(`/order/${res.order.id}/success`);
    } catch (e) {
      setError((e as Error).message);
      setStep('form');
    }
  }

  async function handlePayment(payment: Record<string, unknown>, orderId: string) {
    if (payment.provider === 'RAZORPAY') {
      const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!ok) { setError('Could not load payment gateway'); setStep('form'); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: payment.key,
        order_id: payment.orderId,
        amount: payment.amount,
        currency: payment.currency,
        name: config!.store.name,
        handler: () => { clear(); router.push(`/order/${orderId}/success`); },
        prefill: { name: form.customerName, contact: form.customerPhone, email: form.customerEmail },
        theme: { color: '#16a34a' },
      });
      rzp.open();
      return;
    }
    // Stripe / others: order is created (pending); show success + await webhook.
    clear();
    router.push(`/order/${orderId}/success`);
  }

  // The store can require a signed-in customer before checkout.
  const requireLoginGate = config.checkout.requireLogin && mounted && !session;

  const canPlace =
    form.customerName.length > 1 &&
    phoneValid &&
    (channel === 'WHATSAPP' || !!form.deliveryAddress) &&
    (!requireOtp || !!otpToken) &&
    !requireLoginGate;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-4 font-heading text-2xl font-semibold">Checkout</h1>

      {requireLoginGate && (
        <div className="mb-5 rounded-theme border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Please sign in to place your order.{' '}
          <Link href="/account?redirect=/checkout" className="font-semibold underline">Sign in / Register</Link>
        </div>
      )}

      {mounted && session && (
        <p className="mb-4 text-sm text-[rgb(var(--color-muted))]">
          Signed in as <span className="font-medium">{session.customer.name || session.customer.phone}</span>
        </p>
      )}

      {showChoice && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button onClick={() => setChannel('PAY_NOW')} className={`rounded-theme border p-3 text-center ${channel === 'PAY_NOW' ? 'border-brand bg-brand text-brand-fg' : 'border-slate-300'}`}>Pay Now</button>
          <button onClick={() => setChannel('WHATSAPP')} className={`rounded-theme border p-3 text-center ${channel === 'WHATSAPP' ? 'border-brand bg-brand text-brand-fg' : 'border-slate-300'}`}>Order via WhatsApp</button>
        </div>
      )}

      <div className="space-y-3 rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-4">
        <Field label="Full name" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Phone number" value={form.customerPhone} onChange={(v) => setForm({ ...form, customerPhone: v })} type="tel" inputMode="tel" placeholder="+91 98765 43210" />
          </div>
          {requireOtp && !otpToken && (
            <button onClick={sendOtp} disabled={!phoneValid} className="mb-0.5 rounded-theme border border-brand px-3 py-2 text-sm text-brand disabled:opacity-50">
              {otpSent ? 'Resend' : 'Send OTP'}
            </button>
          )}
        </div>
        {showPhoneError && (
          <p className="-mt-1 text-xs text-red-500">Enter a valid phone number with country code (e.g. +91 98765 43210).</p>
        )}

        {requireOtp && otpSent && !otpToken && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Enter OTP" value={otp} onChange={setOtp} />
            </div>
            <button onClick={verifyOtp} className="mb-0.5 rounded-theme bg-brand px-3 py-2 text-sm text-brand-fg">Verify</button>
          </div>
        )}
        {otpToken && <p className="text-sm text-emerald-600">✓ Phone verified</p>}

        {config.checkout.emailRequirement !== 'NOT_NEEDED' && (
          <Field label={`Email${config.checkout.emailRequirement === 'OPTIONAL' ? ' (optional)' : ''}`} value={form.customerEmail} onChange={(v) => setForm({ ...form, customerEmail: v })} />
        )}

        {(channel === 'PAY_NOW' || !requireOtp || otpToken) && (
          <Textarea label={`Delivery address${channel === 'PAY_NOW' ? '' : ' (optional)'}`} value={form.deliveryAddress} onChange={(v) => setForm({ ...form, deliveryAddress: v })} />
        )}
        <Textarea label="Order notes (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <Field label="Coupon code (optional)" value={form.couponCode} onChange={(v) => setForm({ ...form, couponCode: v })} />
      </div>

      <div className="mt-4 flex items-center justify-between rounded-theme border border-black/5 bg-[rgb(var(--color-surface))] p-4">
        <span>Subtotal</span>
        <span className="font-semibold">{formatMoney(subtotalMinor(), config.store.currency)}</span>
      </div>

      {error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}

      <button
        disabled={!canPlace || step === 'processing'}
        onClick={placeOrder}
        className="mt-4 w-full rounded-theme bg-brand px-5 py-3 font-medium text-brand-fg disabled:opacity-50"
      >
        {step === 'processing' ? 'Processing…' : channel === 'WHATSAPP' ? 'Order via WhatsApp' : 'Pay Now'}
      </button>
      {requireOtp && !otpToken && <p className="mt-2 text-center text-xs text-[rgb(var(--color-muted))]">Verify your phone to continue</p>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full rounded-theme border border-slate-300 px-3 py-2 outline-none focus:border-brand"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full rounded-theme border border-slate-300 px-3 py-2 outline-none focus:border-brand" />
    </label>
  );
}
