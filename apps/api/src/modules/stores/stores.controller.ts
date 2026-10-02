import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  checkoutSettingsSchema,
  customerAuthSettingsSchema,
  UserRole,
  type CheckoutSettingsInput,
  type CustomerAuthSettingsInput,
} from '@utanstore/shared';
import { StoresService } from './stores.service';
import { TenantResolutionService } from '../tenant/tenant-resolution.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles, Public } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('stores')
@Controller()
export class StoresController {
  constructor(
    private readonly stores: StoresService,
    private readonly audit: AuditLogService,
    private readonly tenantResolution: TenantResolutionService,
  ) {}

  // ---- Storefront (public) ----
  @Public()
  @Get('store/config')
  @ApiOperation({ summary: 'Public storefront configuration (store + theme + checkout)' })
  config() {
    return this.stores.getStorefrontConfig();
  }

  @Public()
  @Get('store/availability')
  @ApiOperation({ summary: 'Store status for a host (used to render suspended / coming-soon pages)' })
  availability(@Req() req: Request) {
    const host =
      (req.headers['x-store-host'] as string) ||
      (req.headers['x-forwarded-host'] as string) ||
      req.headers.host ||
      '';
    return this.tenantResolution.resolveStatus(host);
  }

  @Public()
  @Get('store/checkout-settings')
  @ApiOperation({ summary: 'Public checkout settings' })
  publicCheckout() {
    return this.stores.getCheckoutSettings();
  }

  @Public()
  @Get('store/legal')
  @ApiOperation({ summary: 'Public legal/policy page content (privacy, terms, refund)' })
  legal() {
    return this.stores.getLegal();
  }

  // ---- Admin: store profile ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/store')
  @ApiOperation({ summary: 'Get store profile + settings' })
  getStore() {
    return this.stores.getStore();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Put('admin/store')
  @ApiOperation({ summary: 'Update store profile' })
  updateStore(@Body() body: Record<string, unknown>) {
    return this.stores.updateStore(body);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Put('admin/store/settings')
  @ApiOperation({ summary: 'Update store settings (address, SEO, hours...)' })
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.stores.updateSettings(body);
  }

  // ---- Admin: checkout settings ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/checkout-settings')
  @ApiOperation({ summary: 'Get checkout settings' })
  getCheckout() {
    return this.stores.getCheckoutSettings();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Put('admin/checkout-settings')
  @ApiOperation({ summary: 'Update checkout settings (WhatsApp / Pay-now / both)' })
  updateCheckout(@Body(new ZodValidationPipe(checkoutSettingsSchema)) dto: CheckoutSettingsInput) {
    return this.stores.updateCheckoutSettings(dto);
  }

  // ---- Admin: customer auth settings ----
  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER, UserRole.STAFF)
  @Get('admin/customer-auth-settings')
  @ApiOperation({ summary: 'Get customer verification settings' })
  getCustomerAuth() {
    return this.stores.getCustomerAuthSettings();
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Put('admin/customer-auth-settings')
  @ApiOperation({ summary: 'Update customer verification settings' })
  async updateCustomerAuth(@Body(new ZodValidationPipe(customerAuthSettingsSchema)) dto: CustomerAuthSettingsInput) {
    const result = await this.stores.updateCustomerAuthSettings(dto);
    await this.audit.record({ action: 'AUTH_SETTING_CHANGE', entityType: 'CustomerAuthSetting' });
    return result;
  }
}
