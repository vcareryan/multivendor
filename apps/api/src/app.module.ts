import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

import { ConfigModule } from './config/config.module';
import type { Env } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorefrontCacheModule } from './common/cache/storefront-cache.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { TenantModule } from './modules/tenant/tenant.module';

import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { StoresModule } from './modules/stores/stores.module';
import { DomainsModule } from './modules/domains/domains.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ThemesModule } from './modules/themes/themes.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { OtpModule } from './modules/otp/otp.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';

@Module({
  imports: [
    ConfigModule,
    // Global JwtModule so the app-wide JwtAuthGuard (APP_GUARD) can resolve JwtService.
    JwtModule.register({ global: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL', { infer: true }) * 1000,
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.get('REDIS_URL', { infer: true }), { lazyConnect: true }),
        ),
      }),
    }),
    PrismaModule,
    RedisModule,
    StorefrontCacheModule,
    CryptoModule,
    TenantModule,
    AuditLogModule,
    // Feature modules
    AuthModule,
    HealthModule,
    StoresModule,
    DomainsModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    CouponsModule,
    DeliveryModule,
    CustomersModule,
    OrdersModule,
    ThemesModule,
    IntegrationsModule,
    WhatsAppModule,
    OtpModule,
    PaymentsModule,
    CheckoutModule,
    CustomerAuthModule,
    StaffModule,
    ReportsModule,
    SubscriptionsModule,
    FileUploadModule,
    SuperAdminModule,
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
