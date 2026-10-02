import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  googleAuthSettingsSchema,
  paymentSettingsSchema,
  smsProviderSettingsSchema,
  whatsappBusinessSettingsSchema,
  UserRole,
} from '@utanstore/shared';
import { IntegrationsService } from './integrations.service';
import type {
  GoogleAuthSettingsInput,
  PaymentSettingsInput,
  SmsProviderSettingsInput,
  WhatsAppBusinessSettingsInput,
} from './integrations.types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AuditLogService } from '../audit-log/audit-log.service';

@ApiTags('integration-settings')
@UseGuards(TenantGuard)
@Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
@Controller('admin')
export class IntegrationsController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly audit: AuditLogService,
  ) {}

  // ---- Payment ----
  @Get('payment-settings')
  @ApiOperation({ summary: 'Get payment settings (secrets masked)' })
  getPayment() {
    return this.integrations.getPaymentSettingMasked();
  }

  @Put('payment-settings')
  @ApiOperation({ summary: 'Update payment gateway settings' })
  async updatePayment(@Body(new ZodValidationPipe(paymentSettingsSchema)) dto: PaymentSettingsInput) {
    const res = await this.integrations.updatePaymentSetting(dto);
    await this.audit.record({ action: 'PAYMENT_SETTING_CHANGE', entityType: 'StorePaymentSetting' });
    return res;
  }

  // ---- Google ----
  @Get('google-auth-settings')
  @ApiOperation({ summary: 'Get Google Sign-In settings (secrets masked)' })
  getGoogle() {
    return this.integrations.getGoogleMasked();
  }

  @Put('google-auth-settings')
  @ApiOperation({ summary: 'Update Google Sign-In settings' })
  async updateGoogle(@Body(new ZodValidationPipe(googleAuthSettingsSchema)) dto: GoogleAuthSettingsInput) {
    const res = await this.integrations.updateGoogle(dto);
    await this.audit.record({ action: 'AUTH_SETTING_CHANGE', entityType: 'GoogleAuthSetting' });
    return res;
  }

  // ---- WhatsApp Business (OTP) ----
  @Get('whatsapp-settings')
  @ApiOperation({ summary: 'Get WhatsApp Business API settings (secrets masked)' })
  getWhatsApp() {
    return this.integrations.getWhatsAppMasked();
  }

  @Put('whatsapp-settings')
  @ApiOperation({ summary: 'Update WhatsApp Business API settings' })
  async updateWhatsApp(@Body(new ZodValidationPipe(whatsappBusinessSettingsSchema)) dto: WhatsAppBusinessSettingsInput) {
    const res = await this.integrations.updateWhatsApp(dto);
    await this.audit.record({ action: 'AUTH_SETTING_CHANGE', entityType: 'WhatsAppBusinessSetting' });
    return res;
  }

  // ---- SMS (OTP) ----
  @Get('sms-settings')
  @ApiOperation({ summary: 'Get SMS provider settings (secrets masked)' })
  getSms() {
    return this.integrations.getSmsMasked();
  }

  @Put('sms-settings')
  @ApiOperation({ summary: 'Update SMS provider settings' })
  async updateSms(@Body(new ZodValidationPipe(smsProviderSettingsSchema)) dto: SmsProviderSettingsInput) {
    const res = await this.integrations.updateSms(dto);
    await this.audit.record({ action: 'AUTH_SETTING_CHANGE', entityType: 'SMSProviderSetting' });
    return res;
  }
}
