import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Industry, PlanTier, StoreStatus } from '@utanstore/db';
import { UserRole } from '@utanstore/shared';
import { SuperAdminService } from './super-admin.service';
import { Roles } from '../../common/decorators';

/**
 * Super-admin surface. Guarded by @Roles(SUPER_ADMIN); the global JwtAuthGuard
 * authenticates and flags RLS bypass for this role.
 */
@ApiTags('super-admin')
@Roles(UserRole.SUPER_ADMIN)
@Controller('super')
export class SuperAdminController {
  constructor(private readonly superAdmin: SuperAdminService) {}

  @Get('stores')
  @ApiOperation({ summary: 'List all stores' })
  listStores(@Query() query: { page?: string; pageSize?: string; search?: string; status?: StoreStatus }) {
    return this.superAdmin.listStores(query);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get a store' })
  getStore(@Param('id') id: string) {
    return this.superAdmin.getStore(id);
  }

  @Post('stores')
  @ApiOperation({ summary: 'Create a store + owner' })
  createStore(@Body() body: { name: string; industry: Industry; ownerName: string; ownerEmail: string; ownerPassword: string; whatsappNumber?: string }) {
    return this.superAdmin.createStore(body);
  }

  @Put('stores/:id/status')
  @ApiOperation({ summary: 'Enable / suspend / disable a store' })
  setStatus(@Param('id') id: string, @Body('status') status: StoreStatus) {
    return this.superAdmin.setStoreStatus(id, status);
  }

  @Post('stores/:id/impersonate')
  @ApiOperation({ summary: 'Impersonate a store owner (support access, audited)' })
  impersonate(@Param('id') id: string) {
    return this.superAdmin.impersonate(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'List platform users' })
  listUsers(@Query() query: { page?: string; pageSize?: string }) {
    return this.superAdmin.listUsers(query);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List subscription plans' })
  listPlans() {
    return this.superAdmin.listPlans();
  }

  @Put('plans/:tier')
  @ApiOperation({ summary: 'Create / update a subscription plan' })
  upsertPlan(@Param('tier') tier: PlanTier, @Body() body: { name: string; priceMinor: number; currency?: string; interval?: string; limits: object; isActive?: boolean }) {
    return this.superAdmin.upsertPlan(tier, body);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List industry templates' })
  listTemplates() {
    return this.superAdmin.listTemplates();
  }

  @Put('templates')
  @ApiOperation({ summary: 'Create / update an industry template' })
  upsertTemplate(@Body() body: { id?: string; industry: Industry; key: string; name: string; description?: string; defaultConfig: object; isActive?: boolean; isPremium?: boolean }) {
    return this.superAdmin.upsertTemplate(body);
  }

  @Get('domains')
  @ApiOperation({ summary: 'List all custom domains' })
  listDomains() {
    return this.superAdmin.listDomains();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Platform-wide reports (GMV, revenue, usage)' })
  reports() {
    return this.superAdmin.platformReport();
  }

  @Get('settings/:key')
  @ApiOperation({ summary: 'Get a system setting' })
  getSetting(@Param('key') key: string) {
    return this.superAdmin.getSetting(key);
  }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Set a system setting' })
  setSetting(@Param('key') key: string, @Body('value') value: object) {
    return this.superAdmin.setSetting(key, value);
  }
}
