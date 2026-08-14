import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // تفعيل حماية Helmet للإنتاج
  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  const standardRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const refreshRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/v1/auth/login', loginRateLimit);
  app.use('/api/v1/auth/refresh', refreshRateLimit);
  app.use(standardRateLimit);

  const configuredCorsOrigin = configService.get<string>('CORS_ORIGIN');
  if (configService.get<string>('NODE_ENV') === 'production' && !configuredCorsOrigin) {
    throw new Error('CORS_ORIGIN must be configured in production');
  }
  const corsOrigins = (configuredCorsOrigin || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
