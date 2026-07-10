import { Global, Module } from '@nestjs/common';
import { StorefrontCacheService } from './storefront-cache.service';

/** Global so any feature service can read/invalidate the storefront cache. */
@Global()
@Module({
  providers: [StorefrontCacheService],
  exports: [StorefrontCacheService],
})
export class StorefrontCacheModule {}
