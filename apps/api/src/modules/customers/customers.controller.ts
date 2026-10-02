import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@utanstore/shared';
import { CustomersService } from './customers.service';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('customers')
@UseGuards(TenantGuard)
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  list(@Query() query: { page?: string; pageSize?: string; search?: string }) {
    return this.customers.list(query);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get(':id')
  @ApiOperation({ summary: 'Get a customer with recent orders' })
  get(@Param('id') id: string) {
    return this.customers.get(id);
  }
}
