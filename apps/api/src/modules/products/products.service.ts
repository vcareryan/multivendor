import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@utanstore/db';
import type { ProductInput } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';
import { parsePage, buildListResponse } from '../../common/utils/pagination';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface ProductQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  featured?: string;
  activeOnly?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async list(query: ProductQuery, opts: { publicOnly: boolean }) {
    const { page, pageSize, skip, take } = parsePage(query);
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (opts.publicOnly) where.isActive = true;
    else if (query.activeOnly === 'true') where.isActive = true;

    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.categorySlug) where.category = { slug: query.categorySlug };
    if (query.featured === 'true') where.isFeatured = true;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { priceMinor: 'asc' }
        : query.sort === 'price_desc'
          ? { priceMinor: 'desc' }
          : { createdAt: 'desc' };

    const [rows, total] = await Promise.all([
      this.prisma.client.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          images: { orderBy: { position: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
          variants: opts.publicOnly ? { where: { isActive: true } } : true,
          addons: opts.publicOnly ? { where: { isActive: true } } : true,
        },
      }),
      this.prisma.client.product.count({ where }),
    ]);
    return buildListResponse(rows, total, page, pageSize);
  }

  async getBySlug(slug: string) {
    const product = await this.prisma.client.product.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
        variants: { where: { isActive: true } },
        addons: { where: { isActive: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getById(id: string) {
    const product = await this.prisma.client.product.findFirst({
      where: { id, deletedAt: null },
      include: { images: true, variants: true, addons: true, category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(input: ProductInput) {
    await this.subscriptions.assertProductQuota();
    const t = this.prisma.tenantId;
    return this.prisma.client.product.create({
      data: {
        tenantId: t,
        name: input.name,
        nameMl: input.nameMl ?? null,
        slug: input.slug ? slugify(input.slug) : slugify(input.name),
        description: input.description ?? null,
        descriptionMl: input.descriptionMl ?? null,
        type: input.type,
        categoryId: input.categoryId ?? null,
        priceMinor: input.priceMinor,
        salePriceMinor: input.salePriceMinor ?? null,
        sku: input.sku ?? null,
        barcode: input.barcode ?? null,
        stock: input.stock ?? 0,
        trackInventory: input.trackInventory ?? true,
        isActive: input.isActive ?? true,
        isFeatured: input.isFeatured ?? false,
        isPreOrder: input.isPreOrder ?? false,
        weightGrams: input.weightGrams ?? null,
        images: { create: input.imageUrls.map((url, i) => ({ tenantId: t, url, position: i })) },
        variants: {
          create: input.variants.map((v) => ({
            tenantId: t,
            name: v.name,
            label: v.label,
            sku: v.sku ?? null,
            priceMinor: v.priceMinor,
            salePriceMinor: v.salePriceMinor ?? null,
            stock: v.stock ?? 0,
            weightGrams: v.weightGrams ?? null,
            isActive: v.isActive ?? true,
          })),
        },
        addons: {
          create: input.addons.map((a) => ({ tenantId: t, name: a.name, priceMinor: a.priceMinor, isActive: a.isActive ?? true })),
        },
      },
      include: { images: true, variants: true, addons: true },
    });
  }

  async update(id: string, input: Partial<ProductInput>) {
    await this.getById(id);
    const t = this.prisma.tenantId;
    // Replace nested collections when provided (simple + predictable for admin UI).
    return this.prisma.client.$transaction(async () => {
      if (input.imageUrls) {
        await this.prisma.client.productImage.deleteMany({ where: { productId: id } });
      }
      if (input.variants) {
        await this.prisma.client.productVariant.deleteMany({ where: { productId: id } });
      }
      if (input.addons) {
        await this.prisma.client.productAddon.deleteMany({ where: { productId: id } });
      }
      return this.prisma.client.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.nameMl !== undefined ? { nameMl: input.nameMl } : {}),
          ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.descriptionMl !== undefined ? { descriptionMl: input.descriptionMl } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.priceMinor !== undefined ? { priceMinor: input.priceMinor } : {}),
          ...(input.salePriceMinor !== undefined ? { salePriceMinor: input.salePriceMinor } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
          ...(input.stock !== undefined ? { stock: input.stock } : {}),
          ...(input.trackInventory !== undefined ? { trackInventory: input.trackInventory } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
          ...(input.isPreOrder !== undefined ? { isPreOrder: input.isPreOrder } : {}),
          ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
          ...(input.imageUrls ? { images: { create: input.imageUrls.map((url, i) => ({ tenantId: t, url, position: i })) } } : {}),
          ...(input.variants
            ? {
                variants: {
                  create: input.variants.map((v) => ({
                    tenantId: t,
                    name: v.name,
                    label: v.label,
                    sku: v.sku ?? null,
                    priceMinor: v.priceMinor,
                    salePriceMinor: v.salePriceMinor ?? null,
                    stock: v.stock ?? 0,
                    weightGrams: v.weightGrams ?? null,
                    isActive: v.isActive ?? true,
                  })),
                },
              }
            : {}),
          ...(input.addons
            ? { addons: { create: input.addons.map((a) => ({ tenantId: t, name: a.name, priceMinor: a.priceMinor, isActive: a.isActive ?? true })) } }
            : {}),
        },
        include: { images: true, variants: true, addons: true },
      });
    });
  }

  async remove(id: string) {
    await this.getById(id);
    await this.prisma.client.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { deleted: true };
  }

  async setActive(id: string, isActive: boolean) {
    await this.getById(id);
    return this.prisma.client.product.update({ where: { id }, data: { isActive } });
  }
}
