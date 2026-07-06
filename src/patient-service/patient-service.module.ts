import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientServiceController } from './patient-service.controller';
import { PatientServiceService } from './patient-service.service';

@Module({
  imports: [PrismaModule],
  controllers: [PatientServiceController],
  providers: [PatientServiceService],
})
export class PatientServiceModule {}
