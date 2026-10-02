import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import { createHmac } from 'node:crypto';
import { EncryptionService } from '../../../common/crypto/encryption.service';
import type {
  CreatedGatewayOrder,
  GatewayCredentials,
  PaymentGateway,
  WebhookResult,
} from './payment-gateway.interface';

@Injectable()
export class RazorpayGateway implements PaymentGateway {
  readonly provider = 'RAZORPAY';

  async createOrder(params: {
    amountMinor: number;
    currency: string;
    orderNumber: string;
    credentials: GatewayCredentials;
  }): Promise<CreatedGatewayOrder> {
    const { keyId, keySecret } = params.credentials;
    if (!keyId || !keySecret) throw new Error('Razorpay credentials not configured');

    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await client.orders.create({
      amount: params.amountMinor, // paise
      currency: params.currency,
      receipt: params.orderNumber,
      notes: { orderNumber: params.orderNumber },
    });

    return {
      providerOrderId: order.id,
      clientParams: { key: keyId, orderId: order.id, amount: order.amount, currency: order.currency },
    };
  }

  verifyWebhook(params: { rawBody: Buffer | string; signature: string; credentials: GatewayCredentials }): WebhookResult {
    const { webhookSecret } = params.credentials;
    if (!webhookSecret) return { providerOrderId: null, providerPaymentId: null, status: 'IGNORED', raw: null };

    const body = typeof params.rawBody === 'string' ? params.rawBody : params.rawBody.toString('utf8');
    const expected = createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (!EncryptionService.safeEqual(expected, params.signature || '')) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const event = JSON.parse(body) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    const entity = event.payload?.payment?.entity;
    let status: WebhookResult['status'] = 'IGNORED';
    if (event.event === 'payment.captured' || event.event === 'order.paid') status = 'PAID';
    else if (event.event === 'payment.failed') status = 'FAILED';
    else if (event.event === 'refund.processed') status = 'REFUNDED';

    return {
      providerOrderId: entity?.order_id ?? null,
      providerPaymentId: entity?.id ?? null,
      status,
      raw: event,
    };
  }
}
