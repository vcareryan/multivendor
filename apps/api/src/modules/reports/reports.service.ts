import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@utanstore/db';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dashboard summary: revenue, order counts, and key figures. */
  async summary(days = 30) {
    const since = new Date(Date.now() - days * 864e5);
    const c = this.prisma.client;

    const [totalOrders, recentOrders, delivered, revenueAgg, paidAgg, customers, lowStock, statusGroups] = await Promise.all([
      c.order.count(),
      c.order.count({ where: { createdAt: { gte: since } } }),
      c.order.count({ where: { status: OrderStatus.DELIVERED } }),
      c.order.aggregate({ _sum: { totalMinor: true }, where: { createdAt: { gte: since }, status: { not: OrderStatus.CANCELLED } } }),
      c.paymentTransaction.aggregate({ _sum: { amountMinor: true }, where: { status: PaymentStatus.PAID, createdAt: { gte: since } } }),
      c.customer.count(),
      c.product.count({ where: { deletedAt: null, trackInventory: true, stock: { lte: 5 } } }),
      c.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      periodDays: days,
      revenueMinor: revenueAgg._sum.totalMinor ?? 0,
      paidRevenueMinor: paidAgg._sum.amountMinor ?? 0,
      totalOrders,
      recentOrders,
      deliveredOrders: delivered,
      customers,
      lowStockCount: lowStock,
      ordersByStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all])),
    };
  }

  /** Daily revenue + order count time series. */
  async timeSeries(days = 30) {
    const since = new Date(Date.now() - days * 864e5);
    const orders = await this.prisma.client.order.findMany({
      where: { createdAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
      select: { createdAt: true, totalMinor: true },
    });
    const map = new Map<string, { date: string; orders: number; revenueMinor: number }>();
    for (const o of orders) {
      const date = o.createdAt.toISOString().slice(0, 10);
      const row = map.get(date) ?? { date, orders: 0, revenueMinor: 0 };
      row.orders += 1;
      row.revenueMinor += o.totalMinor;
      map.set(date, row);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Top-selling products by quantity. */
  async topProducts(limit = 10) {
    const grouped = await this.prisma.client.orderItem.groupBy({
      by: ['name'],
      _sum: { quantity: true, lineTotalMinor: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({ name: g.name, quantity: g._sum.quantity ?? 0, revenueMinor: g._sum.lineTotalMinor ?? 0 }));
  }
}
