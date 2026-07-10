import 'reflect-metadata';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false, rawBody: true });
  const config = app.get(ConfigService) as ConfigService<Env, true>;
  const logger = new Logger('Bootstrap');

  app.use(helmet());
  app.use(cookieParser());

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const webUrl = config.get('WEB_URL', { infer: true });
  const baseDomain = config.get('APP_BASE_DOMAIN', { infer: true });
  app.enableCors({
    origin: [webUrl, new RegExp(`\\.${baseDomain.replace('.', '\\.')}$`), /localhost:\d+$/],
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
