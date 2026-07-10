import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { OrdersModule } from '../orders/orders.module';
import { StoresModule } from '../stores/stores.module';

@Module({
  imports: [OrdersModule, StoresModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
