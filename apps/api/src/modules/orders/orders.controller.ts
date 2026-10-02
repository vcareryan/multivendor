import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus } from '@utanstore/db';
import { UserRole } from '@utanstore/shared';
import { OrdersService } from './orders.service';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ---- Storefront (public): order tracking by id ----
  @Public()
  @Get('store/orders/:id')
  @ApiOperation({ summary: 'Track an order (storefront)' })
  track(@Param('id') id: string) {
    return this.orders.get(id);
  }

  // ---- Admin ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/orders')
  @ApiOperation({ summary: 'List orders (paginated, filterable by status)' })
  list(@Query() query: { page?: string; pageSize?: string; status?: OrderStatus; search?: string }) {
    return this.orders.adminList(query);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/orders/:id')
  @ApiOperation({ summary: 'Get an order' })
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Patch('admin/orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.orders.updateStatus(id, status);
  }
}
