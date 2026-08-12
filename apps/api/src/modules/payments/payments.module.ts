import { Global, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RazorpayGateway } from './gateways/razorpay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { PaypalGateway } from './gateways/paypal.gateway';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayGateway, StripeGateway, PaypalGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
