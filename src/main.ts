import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import cookieParser = require('cookie-parser');
import compression = require('compression');

import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

function stalePortraitFallback(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    next();
    return;
  }

  res.status(204).end();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    // FE và BE khác origin (Cloud Run) — img/video cần CORP cross-origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable CSP for now as it might block frontend scripts/styles in some environments
  }));
  app.use(compression());
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
    maxAge: 86400000, // 1 day
  });
  app.use('/uploads/portraits', stalePortraitFallback);
  app.use(cookieParser());
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
  }));

  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = corsOrigins?.length ? corsOrigins : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3003);
}

void bootstrap();

