import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { couponSchema, UserRole, type CouponInput } from '@utanstore/shared';
import { CouponsService } from './coupons.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('coupons')
@UseGuards(TenantGuard)
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get()
  @ApiOperation({ summary: 'List coupons' })
  list() {
    return this.coupons.list();
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body(new ZodValidationPipe(couponSchema)) dto: CouponInput) {
    return this.coupons.create(dto);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  update(@Param('id') id: string, @Body(new ZodValidationPipe(couponSchema.partial())) dto: Partial<CouponInput>) {
    return this.coupons.update(id, dto);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
