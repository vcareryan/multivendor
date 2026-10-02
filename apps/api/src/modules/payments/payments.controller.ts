import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { initiatePaymentSchema, UserRole } from '@utanstore/shared';
import { PaymentsService } from './payments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public, Roles } from '../../common/decorators';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('payments/initiate')
  @ApiOperation({ summary: 'Initiate payment for an order (returns client params)' })
  initiate(@Body(new ZodValidationPipe(initiatePaymentSchema)) dto: { orderId: string }) {
    return this.payments.initiate(dto.orderId);
  }

  @Public()
  @Post('payments/webhook/:provider')
  @ApiOperation({ summary: 'Payment gateway webhook (signature verified)' })
  webhook(
    @Param('provider') provider: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') razorpaySig?: string,
    @Headers('stripe-signature') stripeSig?: string,
  ) {
    const signature = razorpaySig || stripeSig || '';
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    return this.payments.handleWebhook(provider, raw, signature);
  }

  @UseGuards(TenantGuard)
  @Roles(UserRole.STORE_OWNER, UserRole.STORE_MANAGER)
  @Get('admin/payment-transactions')
  @ApiOperation({ summary: 'List payment transactions' })
  transactions() {
    return this.payments.listTransactions();
  }
}
