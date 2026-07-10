import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@utanstore/shared';
import { InventoryService } from './inventory.service';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('inventory')
@UseGuards(TenantGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('low-stock')
  @ApiOperation({ summary: 'List low-stock products' })
  lowStock(@Query('threshold') threshold?: string) {
    return this.inventory.lowStock(threshold ? Number(threshold) : 5);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get(':productId/history')
  @ApiOperation({ summary: 'Stock movement history for a product' })
  history(@Param('productId') productId: string) {
    return this.inventory.history(productId);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Post('adjust')
  @ApiOperation({ summary: 'Adjust stock (manual movement)' })
  adjust(
    @Body() body: { productId: string; variantId?: string; changeQty: number; reason?: string; reference?: string },
  ) {
    return this.inventory.adjust(body);
  }
}
