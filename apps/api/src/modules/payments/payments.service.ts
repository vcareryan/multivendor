import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentProviderType, PaymentStatus } from '@utanstore/db';
import { PrismaService } from '../../prisma/prisma.service';
import { runBypassingRls } from '../../common/context/request-context';
import { IntegrationsService } from '../integrations/integrations.service';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { PaypalGateway } from './gateways/paypal.gateway';
import type { GatewayCredentials, PaymentGateway } from './gateways/payment-gateway.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly gateways: Record<string, PaymentGateway>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
    razorpay: RazorpayGateway,
    stripe: StripeGateway,
    paypal: PaypalGateway,
  ) {
    this.gateways = {
      [PaymentProviderType.RAZORPAY]: razorpay,
      [PaymentProviderType.STRIPE]: stripe,
      [PaymentProviderType.PAYPAL]: paypal,
    };
  }

  /**
   * Initiate payment for an existing (PENDING/OTP_VERIFIED) order. Creates the
   * gateway order and returns non-secret client params to open checkout.
   */
  async initiate(orderId: string) {
    const order = await this.prisma.client.order.findFirst({ where: { id: orderId }, include: { payment: true } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.payment && order.payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Order already paid');
    }

    const tenantId = order.tenantId;
    const setting = await this.integrations.resolvePaymentSetting(tenantId);
    if (!setting || !setting.enabled || !setting.provider) {
      throw new BadRequestException('Online payments are not enabled for this store');
    }

    const gateway = this.gateways[setting.provider];
    if (!gateway) throw new BadRequestException(`Unsupported provider: ${setting.provider}`);

    const credentials: GatewayCredentials = {
      keyId: setting.keyId,
      keySecret: setting.keySecret,
      webhookSecret: setting.webhookSecret,
      mode: setting.mode,
    };

    const created = await gateway.createOrder({
      amountMinor: order.totalMinor,
      currency: order.currency,
      orderNumber: order.orderNumber,
      credentials,
    });

    await this.prisma.client.paymentTransaction.upsert({
      where: { orderId: order.id },
      create: {
        tenantId,
        orderId: order.id,
        provider: setting.provider,
        mode: setting.mode,
        status: PaymentStatus.INITIATED,
        amountMinor: order.totalMinor,
        currency: order.currency,
        providerOrderId: created.providerOrderId,
      },
      update: { status: PaymentStatus.INITIATED, providerOrderId: created.providerOrderId },
    });

    return { provider: setting.provider, ...created.clientParams };
  }

  /**
   * Handle an incoming gateway webhook. Verifies the signature, then updates the
   * payment transaction + order. Runs under RLS bypass because webhooks arrive
   * without a tenant/host context; the tenant is derived from the transaction.
   */
  async handleWebhook(provider: string, rawBody: Buffer | string, signature: string) {
    const gateway = this.gateways[provider.toUpperCase()];
    if (!gateway) throw new BadRequestException('Unknown provider');

    return runBypassingRls(async () => {
      // We must know which tenant/credentials to verify against. Parse the
      // provider order id first (unverified), locate the txn, load its tenant
      // credentials, THEN verify the signature.
      const peek = this.peekProviderOrderId(provider, rawBody);
      let txn = peek
        ? await this.prisma.raw.paymentTransaction.findFirst({ where: { providerOrderId: peek } })
        : null;

      // Fallback: some providers put ids elsewhere — verify per matching setting.
      if (!txn) {
        this.logger.warn(`Webhook for ${provider} could not be matched to a transaction`);
        return { received: true };
      }

      const setting = await this.integrations.resolvePaymentSetting(txn.tenantId);
      if (!setting) return { received: true };

      const result = gateway.verifyWebhook({
        rawBody,
        signature,
        credentials: {
          keyId: setting.keyId,
          keySecret: setting.keySecret,
          webhookSecret: setting.webhookSecret,
          mode: setting.mode,
        },
      });

      if (result.status === 'IGNORED') return { received: true };

      const newStatus =
        result.status === 'PAID'
          ? PaymentStatus.PAID
          : result.status === 'REFUNDED'
            ? PaymentStatus.REFUNDED
            : PaymentStatus.FAILED;

      await this.prisma.raw.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: newStatus,
          providerPaymentId: result.providerPaymentId,
          rawWebhook: result.raw as object,
        },
      });

      if (newStatus === PaymentStatus.PAID) {
        await this.prisma.raw.order.update({ where: { id: txn.orderId }, data: { status: OrderStatus.ACCEPTED } });
      }
      return { received: true, status: newStatus };
    });
  }

  listTransactions() {
    return this.prisma.client.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { order: { select: { orderNumber: true, customerName: true, totalMinor: true } } },
    });
  }

  private peekProviderOrderId(provider: string, rawBody: Buffer | string): string | null {
    try {
      const body = JSON.parse(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'));
      if (provider.toUpperCase() === 'RAZORPAY') return body?.payload?.payment?.entity?.order_id ?? null;
      if (provider.toUpperCase() === 'STRIPE') return body?.data?.object?.payment_intent ?? body?.data?.object?.id ?? null;
      if (provider.toUpperCase() === 'PAYPAL') return body?.resource?.supplementary_data?.related_ids?.order_id ?? body?.resource?.id ?? null;
    } catch {
      /* ignore */
    }
    return null;
  }
}
