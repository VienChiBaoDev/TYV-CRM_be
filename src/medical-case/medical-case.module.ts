import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalCaseController } from './medical-case.controller';
import { MedicalCaseService } from './medical-case.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalCaseController],
  providers: [MedicalCaseService],
})
export class MedicalCaseModule {}
