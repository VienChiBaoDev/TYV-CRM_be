import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalVisitController } from './medical-visit.controller';
import { MedicalVisitService } from './medical-visit.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicalVisitController],
  providers: [MedicalVisitService],
})
export class MedicalVisitModule {}
