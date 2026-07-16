import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { connectPrismaWithRetry } from './prisma-connect.util';

/**
 * Client dedicated to interactive `$transaction(async (tx) => ...)` calls.
 * Uses DIRECT_URL (session pooler, :5432).
 */
@Injectable()
export class PrismaTransactionService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.get<string>('DIRECT_URL') ?? config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DIRECT_URL or DATABASE_URL must be set');
    }
    super({ datasources: { db: { url } } });
  }

  async onModuleInit(): Promise<void> {
    await connectPrismaWithRetry(() => this.$connect());
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
