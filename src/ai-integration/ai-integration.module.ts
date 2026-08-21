import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiIntegrationClient } from './ai-integration.client';
import { AiIntegrationController } from './ai-integration.controller';
import { AiIntegrationService } from './ai-integration.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiIntegrationController],
  providers: [AiIntegrationClient, AiIntegrationService],
})
export class AiIntegrationModule {}
