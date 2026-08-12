import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanTier } from '@utanstore/db';
import { UserRole } from '@utanstore/shared';
import { SubscriptionsService } from './subscriptions.service';
import { Public, Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('subscriptions')
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  plans() {
    return this.subscriptions.listPlans();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get('admin/subscription')
  @ApiOperation({ summary: 'Current subscription + usage' })
  current() {
    return this.subscriptions.getCurrent();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER)
  @Put('admin/subscription')
  @ApiOperation({ summary: 'Change subscription plan' })
  change(@Body('tier') tier: PlanTier) {
    return this.subscriptions.changePlan(tier);
  }
}
