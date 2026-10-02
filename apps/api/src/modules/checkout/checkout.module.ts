import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { OrdersModule } from '../orders/orders.module';
import { StoresModule } from '../stores/stores.module';

import { CustomerAuthModule } from '../customer-auth/customer-auth.module';

@Module({
  imports: [OrdersModule, StoresModule, CustomerAuthModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
