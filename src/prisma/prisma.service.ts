import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { connectPrismaWithRetry } from './prisma-connect.util';

/**
 * Client for regular (non-transactional) queries — the vast majority of the app.
 * Uses DATABASE_URL (Supabase pooler, typically session mode :5432).
 *
 * Do NOT use this client for `$transaction(async (tx) => ...)` on transaction-mode
 * pooler (:6543). Use PrismaTransactionService (DIRECT_URL / session :5432) instead.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL') ?? config.get<string>('DIRECT_URL');
    // cách dưới này query nhanh hơn
    // const url = config.get<string>('DIRECT_URL') ?? config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL or DIRECT_URL must be set');
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
