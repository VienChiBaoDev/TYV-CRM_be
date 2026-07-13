import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientTreatmentController } from './patient-treatment.controller';
import { PatientTreatmentService } from './patient-treatment.service';

@Module({
  imports: [PrismaModule],
  controllers: [PatientTreatmentController],
  providers: [PatientTreatmentService],
})
export class PatientTreatmentModule {}
