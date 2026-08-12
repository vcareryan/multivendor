import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { OrderStatus, Prisma } from '@utanstore/db';
import {
  CheckoutChannel,
  Locale,
  type CartLineItem,
  type CreateOrderInput,
} from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryService } from '../delivery/delivery.service';
import { CustomersService } from '../customers/customers.service';
import { InventoryService } from '../inventory/inventory.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { parsePage, buildListResponse } from '../../common/utils/pagination';

interface PricedLine extends CartLineItem {
  productId: string;
  variantId: string | null;
  lineTotalMinor: number;
  trackInventory: boolean;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalMinor: number;
  discountMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  couponId: string | null;
  couponCode: string | null;
  currency: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    private readonly delivery: DeliveryService,
    private readonly customers: CustomersService,
    private readonly inventory: InventoryService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Server-side pricing. NEVER trusts client prices — everything is re-derived
   * from the database. Returns line items + totals.
   */
  async priceCart(
    items: { productId: string; variantId?: string | null; quantity: number; addonIds?: string[] }[],
    opts: { couponCode?: string | null; deliveryAreaId?: string | null } = {},
  ): Promise<PricedCart> {
    if (!items.length) throw new BadRequestException('Cart is empty');

    const store = await this.prisma.client.store.findFirst({ select: { currency: true } });
    const currency = store?.currency ?? 'INR';

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.client.product.findMany({
      where: { id: { in: productIds }, deletedAt: null, isActive: true },
      include: { variants: true, addons: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const lines: PricedLine[] = [];
    let subtotalMinor = 0;

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) throw new BadRequestException(`Product unavailable: ${item.productId}`);
      if (item.quantity < 1) throw new BadRequestException('Invalid quantity');

      let unitPriceMinor = product.salePriceMinor ?? product.priceMinor;
      let variantLabel: string | null = null;
      let variantId: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId && v.isActive);
        if (!variant) throw new BadRequestException('Variant unavailable');
        unitPriceMinor = variant.salePriceMinor ?? variant.priceMinor;
        variantLabel = variant.label;
        variantId = variant.id;
      }

      const addons: { name: string; priceMinor: number }[] = [];
      for (const addonId of item.addonIds ?? []) {
        const addon = product.addons.find((a) => a.id === addonId && a.isActive);
        if (addon) addons.push({ name: addon.name, priceMinor: addon.priceMinor });
      }
      const addonTotal = addons.reduce((s, a) => s + a.priceMinor, 0);
      const lineUnit = unitPriceMinor + addonTotal;
      const lineTotalMinor = lineUnit * item.quantity;
      subtotalMinor += lineTotalMinor;

      lines.push({
        productId: product.id,
        variantId,
        name: product.name,
        variantLabel,
        quantity: item.quantity,
        unitPriceMinor: lineUnit,
        addons,
        lineTotalMinor,
        trackInventory: product.trackInventory,
      });
    }

    let discountMinor = 0;
    let couponId: string | null = null;
    let couponCode: string | null = null;
    if (opts.couponCode) {
      const c = await this.coupons.computeDiscount(opts.couponCode, subtotalMinor);
      discountMinor = c.discountMinor;
      couponId = c.couponId;
      couponCode = c.code;
    }

    let deliveryMinor = 0;
    if (opts.deliveryAreaId) {
      const fee = await this.delivery.getFee(opts.deliveryAreaId);
      if (fee) {
        if (subtotalMinor < fee.minOrderMinor) {
          throw new BadRequestException('Order below minimum for the selected delivery area');
        }
        deliveryMinor = fee.feeMinor;
      }
    }

    const totalMinor = Math.max(0, subtotalMinor - discountMinor) + deliveryMinor;
    return { lines, subtotalMinor, discountMinor, deliveryMinor, totalMinor, couponId, couponCode, currency };
  }

  /**
   * Persist an order (ALWAYS saved before WhatsApp redirect / payment).
   * Returns the order plus (for WhatsApp) the wa.me link.
   */
  async createOrder(input: CreateOrderInput, opts: { phoneVerified: boolean }) {
    const priced = await this.priceCart(input.items, {
      couponCode: input.couponCode,
      deliveryAreaId: input.deliveryAreaId,
    });

    const store = await this.prisma.client.store.findFirst();
    if (!store) throw new NotFoundException('Store not found');

    const customer = await this.customers.findOrCreateByPhone({
      phone: input.customerPhone,
      name: input.customerName,
      email: input.customerEmail ?? null,
      phoneVerified: opts.phoneVerified,
    });

    const orderNumber = await this.generateOrderNumber();
    const initialStatus: OrderStatus = OrderStatus.NEW;

    const order = await this.prisma.client.order.create({
      data: {
        tenantId: this.prisma.tenantId,
        orderNumber,
        customerId: customer.id,
        status: initialStatus,
        channel: input.channel,
        customerName: input.customerName,
        customerPhone: input.customerPhone.replace(/[^\d]/g, ''),
        customerEmail: input.customerEmail ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        deliveryAreaId: input.deliveryAreaId ?? null,
        notes: input.notes ?? null,
        subtotalMinor: priced.subtotalMinor,
        discountMinor: priced.discountMinor,
        deliveryMinor: priced.deliveryMinor,
        totalMinor: priced.totalMinor,
        currency: priced.currency,
        couponCode: priced.couponCode,
        items: {
          create: priced.lines.map((l) => ({
            tenantId: this.prisma.tenantId,
            productId: l.productId,
            variantId: l.variantId,
            name: l.name,
            variantLabel: l.variantLabel ?? null,
            unitPriceMinor: l.unitPriceMinor,
            quantity: l.quantity,
            addons: (l.addons ?? []) as object,
            lineTotalMinor: l.lineTotalMinor,
          })),
        },
      },
      include: { items: true },
    });

    // Decrement stock + coupon redemption (best-effort).
    await this.inventory.consumeForOrder(
      priced.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity, trackInventory: l.trackInventory })),
      order.orderNumber,
    );
    if (priced.couponId) await this.coupons.incrementRedemption(priced.couponId);

    // WhatsApp channel → build link + log + flip status.
    if (input.channel === CheckoutChannel.WHATSAPP) {
      const { waLink } = await this.whatsapp.buildAndLogOrderLink({
        orderId: order.id,
        ownerPhone: store.whatsappNumber ?? '',
        summary: {
          storeName: store.name,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: order.deliveryAddress,
          items: priced.lines,
          totalMinor: order.totalMinor,
          currency: order.currency,
          notes: order.notes,
          createdAt: order.createdAt,
          locale: input.locale ?? Locale.EN,
        },
      });
      await this.prisma.client.order.update({ where: { id: order.id }, data: { status: OrderStatus.WHATSAPP_SENT } });
      return { order: { ...order, status: OrderStatus.WHATSAPP_SENT }, waLink };
    }

    return { order, waLink: null };
  }

  async adminList(query: { page?: string; pageSize?: string; status?: OrderStatus; search?: string }) {
    const { page, pageSize, skip, take } = parsePage(query);
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerPhone: { contains: query.search } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.client.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { items: true, payment: true },
      }),
      this.prisma.client.order.count({ where }),
    ]);
    return buildListResponse(rows, total, page, pageSize);
  }

  async get(id: string) {
    const order = await this.prisma.client.order.findFirst({
      where: { id },
      include: { items: true, payment: true, whatsappLog: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    await this.get(id);
    return this.prisma.client.order.update({ where: { id }, data: { status } });
  }

  private async generateOrderNumber(): Promise<string> {
    const d = new Date();
    const ymd = `${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `${ymd}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const exists = await this.prisma.client.order.findFirst({ where: { orderNumber: candidate }, select: { id: true } });
      if (!exists) return candidate;
    }
    return `${ymd}-${Date.now().toString().slice(-6)}`;
  }
}
