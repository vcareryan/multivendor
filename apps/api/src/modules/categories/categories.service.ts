import { Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryInput } from '@utanstore/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { slugify } from '../../common/utils/slug';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin: full list (includes inactive). */
  list() {
    return this.prisma.client.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  /** Storefront: active categories only. */
  listPublic() {
    return this.prisma.client.category.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    });
  }

  async get(id: string) {
    const cat = await this.prisma.client.category.findFirst({ where: { id, deletedAt: null } });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(input: CategoryInput) {
    return this.prisma.client.category.create({
      data: {
        tenantId: this.prisma.tenantId,
        name: input.name,
        nameMl: input.nameMl ?? null,
        slug: input.slug ? slugify(input.slug) : slugify(input.name),
        parentId: input.parentId ?? null,
        imageUrl: input.imageUrl ?? null,
        position: input.position ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async update(id: string, input: Partial<CategoryInput>) {
    await this.get(id);
    return this.prisma.client.category.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.nameMl !== undefined ? { nameMl: input.nameMl } : {}),
        ...(input.slug !== undefined ? { slug: slugify(input.slug) } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.client.category.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }
}
