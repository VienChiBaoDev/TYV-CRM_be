import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { connectPrismaWithRetry } from './prisma-connect.util';

/**
 * Shared client for regular queries and interactive transactions.
 * DATABASE_URL must use Supabase session pooler (:5432).
 * Model delegates (staff, refreshToken, …) come from generated Prisma Client.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const url = config.get<string>('DATABASE_URL') ?? config.get<string>('DIRECT_URL');
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
