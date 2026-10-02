import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import type {
  CreatedGatewayOrder,
  GatewayCredentials,
  PaymentGateway,
  WebhookResult,
} from './payment-gateway.interface';

@Injectable()
export class StripeGateway implements PaymentGateway {
  readonly provider = 'STRIPE';

  async createOrder(params: {
    amountMinor: number;
    currency: string;
    orderNumber: string;
    credentials: GatewayCredentials;
  }): Promise<CreatedGatewayOrder> {
    const { keySecret, keyId } = params.credentials;
    if (!keySecret) throw new Error('Stripe secret key not configured');

    const stripe = new Stripe(keySecret);
    const intent = await stripe.paymentIntents.create({
      amount: params.amountMinor,
      currency: params.currency.toLowerCase(),
      metadata: { orderNumber: params.orderNumber },
      automatic_payment_methods: { enabled: true },
    });

    return {
      providerOrderId: intent.id,
      clientParams: { publishableKey: keyId, clientSecret: intent.client_secret },
    };
  }

  verifyWebhook(params: { rawBody: Buffer | string; signature: string; credentials: GatewayCredentials }): WebhookResult {
    const { webhookSecret, keySecret } = params.credentials;
    if (!webhookSecret || !keySecret) return { providerOrderId: null, providerPaymentId: null, status: 'IGNORED', raw: null };

    const stripe = new Stripe(keySecret);
    const event = stripe.webhooks.constructEvent(params.rawBody, params.signature, webhookSecret);

    let status: WebhookResult['status'] = 'IGNORED';
    if (event.type === 'payment_intent.succeeded') status = 'PAID';
    else if (event.type === 'payment_intent.payment_failed') status = 'FAILED';
    else if (event.type === 'charge.refunded') status = 'REFUNDED';

    const obj = event.data.object as { id?: string; payment_intent?: string };
    return {
      providerOrderId: (obj.payment_intent as string) ?? obj.id ?? null,
      providerPaymentId: obj.id ?? null,
      status,
      raw: event,
    };
  }
}
