import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@utanstore/db';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { getRequestContext } from '../../common/context/request-context';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const ASSIGNABLE: UserRole[] = [UserRole.STORE_MANAGER, UserRole.STAFF];

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  list() {
    return this.prisma.client.user.findMany({
      where: { role: { in: [UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF] } },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(input: { name: string; email: string; phone?: string; role: UserRole; password: string }) {
    if (!ASSIGNABLE.includes(input.role)) throw new BadRequestException('Invalid role');
    await this.subscriptions.assertStaffQuota();
    const tenantId = getRequestContext()?.tenantId;
    const existing = await this.prisma.client.user.findFirst({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new ConflictException('A user with this email already exists in the store');

    const passwordHash = await argon2.hash(input.password);
    return this.prisma.client.user.create({
      data: {
        tenantId,
        name: input.name,
        email: input.email.toLowerCase(),
        phone: input.phone ?? null,
        role: input.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  }

  async update(id: string, input: { role?: UserRole; isActive?: boolean; name?: string }) {
    const user = await this.prisma.client.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('Staff member not found');
    if (user.role === UserRole.STORE_OWNER) throw new BadRequestException('Cannot modify the store owner');
    if (input.role && !ASSIGNABLE.includes(input.role)) throw new BadRequestException('Invalid role');
    return this.prisma.client.user.update({
      where: { id },
      data: {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
  }

  async remove(id: string) {
    const user = await this.prisma.client.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException('Staff member not found');
    if (user.role === UserRole.STORE_OWNER) throw new BadRequestException('Cannot remove the store owner');
    await this.prisma.client.user.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }
}
