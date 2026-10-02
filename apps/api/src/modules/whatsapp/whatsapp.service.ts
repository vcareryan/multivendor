import { Injectable } from '@nestjs/common';
import { buildOrderSummary, buildWhatsAppLink, Locale, type OrderSummaryInput } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WhatsAppService {
  constructor(private readonly prisma: PrismaService) {}

  /** Build the wa.me click-to-chat link for an order and persist a log. */
  async buildAndLogOrderLink(params: {
    orderId: string;
    ownerPhone: string;
    summary: OrderSummaryInput;
  }): Promise<{ waLink: string; message: string }> {
    const message = buildOrderSummary(params.summary);
    const waLink = buildWhatsAppLink(params.ownerPhone, message);

    await this.prisma.client.whatsAppOrderLog
      .upsert({
        where: { orderId: params.orderId },
        create: { tenantId: this.prisma.tenantId, orderId: params.orderId, ownerPhone: params.ownerPhone.replace(/[^\d]/g, ''), message, waLink },
        update: { message, waLink },
      })
      .catch(() => undefined);

    return { waLink, message };
  }

  buildLink(ownerPhone: string, summary: OrderSummaryInput): string {
    return buildWhatsAppLink(ownerPhone, buildOrderSummary({ ...summary, locale: summary.locale ?? Locale.EN }));
  }
}
