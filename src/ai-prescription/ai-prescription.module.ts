import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiPrescriptionController } from './ai-prescription.controller';
import { AiPrescriptionService } from './ai-prescription.service';
import { DeepSeekClient } from './deepseek.client';

@Module({
  imports: [PrismaModule],
  controllers: [AiPrescriptionController],
  providers: [DeepSeekClient, AiPrescriptionService],
})
export class AiPrescriptionModule {}
