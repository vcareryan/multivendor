import 'reflect-metadata';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DomainsService } from './modules/domains/domains.service';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(ConfigService) as ConfigService<Env, true>;
  const logger = new Logger('Bootstrap');

  // Allow base64 image uploads (default JSON limit is 100kb). useBodyParser
  // keeps Nest's rawBody capture intact (needed for payment webhook signatures).
  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

  // crossOriginResourcePolicy: cross-origin lets storefront subdomains embed
  // images served from the API origin (api.<domain>/media/...).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const webUrl = config.get('WEB_URL', { infer: true });
  const baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
  const domainsService = app.get(DomainsService);
  const localhostRe = /^https?:\/\/localhost(:\d+)?$/;
  // Allow: the platform web origin, any store subdomain (*.baseDomain), localhost,
  // and any VERIFIED custom store domain — so storefronts on a customer's own
  // domain can call the API from the browser (e.g. the checkout page).
  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (curl, SSR, same-origin) send no Origin header.
      if (!origin) return callback(null, true);
      if (origin === webUrl || localhostRe.test(origin)) return callback(null, true);
      let host: string;
      try {
        host = new URL(origin).hostname;
      } catch {
        return callback(null, false);
      }
      if (host === baseDomain || host.endsWith(`.${baseDomain}`)) return callback(null, true);
      domainsService
        .isAllowedCorsHost(host)
        .then((ok) => callback(null, ok))
        .catch(() => callback(null, false));
    },
    credentials: true,
  });

  // Swagger / OpenAPI (also the contract for the future mobile apps)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('UtanStore API')
    .setDescription('Multi-tenant SaaS e-commerce platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on :${port} (docs at /docs, base /api/v1)`);
}

void bootstrap();
