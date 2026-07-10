import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  checkoutStartSchema,
  createOrderSchema,
  sendOtpSchema,
  verifyOtpSchema,
  type CreateOrderInput,
} from '@utanstore/shared';
import { CheckoutService } from './checkout.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../../common/decorators';

@ApiTags('checkout')
@Public()
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start checkout — price the cart + return allowed channels' })
  start(@Body(new ZodValidationPipe(checkoutStartSchema)) dto: ReturnType<typeof checkoutStartSchema.parse>) {
    return this.checkout.start(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('send-otp')
  @ApiOperation({ summary: 'Send an OTP to the customer phone (rate limited)' })
  sendOtp(@Body(new ZodValidationPipe(sendOtpSchema)) dto: ReturnType<typeof sendOtpSchema.parse>, @Req() req: Request) {
    return this.checkout.sendOtp(dto as never, req.ip);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify the OTP and receive a verification token' })
  verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) dto: ReturnType<typeof verifyOtpSchema.parse>) {
    return this.checkout.verifyOtp(dto);
  }

  @Post('create-order')
  @ApiOperation({ summary: 'Create the order (saved before WhatsApp/payment redirect)' })
  createOrder(@Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderInput) {
    return this.checkout.createOrder(dto);
  }
}
