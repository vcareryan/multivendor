import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { deliveryAreaSchema, UserRole, type DeliveryAreaInput } from '@utanstore/shared';
import { DeliveryService } from './delivery.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('delivery')
@Controller()
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Public()
  @Get('store/delivery-areas')
  @ApiOperation({ summary: 'List active delivery areas (storefront)' })
  listPublic() {
    return this.delivery.list(true);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/delivery-areas')
  @ApiOperation({ summary: 'List delivery areas (admin)' })
  list() {
    return this.delivery.list(false);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('admin/delivery-areas')
  @ApiOperation({ summary: 'Create a delivery area' })
  create(@Body(new ZodValidationPipe(deliveryAreaSchema)) dto: DeliveryAreaInput) {
    return this.delivery.create(dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Patch('admin/delivery-areas/:id')
  @ApiOperation({ summary: 'Update a delivery area' })
  update(@Param('id') id: string, @Body(new ZodValidationPipe(deliveryAreaSchema.partial())) dto: Partial<DeliveryAreaInput>) {
    return this.delivery.update(id, dto);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Delete('admin/delivery-areas/:id')
  @ApiOperation({ summary: 'Delete a delivery area' })
  remove(@Param('id') id: string) {
    return this.delivery.remove(id);
  }
}
