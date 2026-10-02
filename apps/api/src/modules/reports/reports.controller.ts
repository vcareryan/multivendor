import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@utanstore/shared';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('reports')
@UseGuards(TenantGuard)
@Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary metrics' })
  summary(@Query('days') days?: string) {
    return this.reports.summary(days ? Number(days) : 30);
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Daily revenue + order time series' })
  timeSeries(@Query('days') days?: string) {
    return this.reports.timeSeries(days ? Number(days) : 30);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top selling products' })
  topProducts(@Query('limit') limit?: string) {
    return this.reports.topProducts(limit ? Number(limit) : 10);
  }
}
