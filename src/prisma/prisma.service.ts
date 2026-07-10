import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    // ponytail: DIRECT_URL = session pooler :5432 — supports interactive $transaction.
    // DATABASE_URL (transaction pooler :6543) breaks $transaction(async (tx) => ...).
    const url = config.get<string>('DIRECT_URL') ?? config.get<string>('DATABASE_URL');
    super({ datasources: { db: { url } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
