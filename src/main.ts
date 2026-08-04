import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import compression from 'compression';

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
  // Cho phép mọi domain Vercel cua du an (production, git-branch, preview theo hash)
  const vercelOriginPattern = /^https:\/\/tyv-crm[a-z0-9-]*\.vercel\.app$/i;

  app.enableCors({
    origin: (origin, callback) => {
      // Request khong co origin (Postman, server-to-server, health check) -> cho phep
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || vercelOriginPattern.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin khong duoc phep boi CORS: ${origin}`), false);
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3003);
}

void bootstrap();

