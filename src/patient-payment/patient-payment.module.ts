import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PatientPaymentController } from './patient-payment.controller';
import { PatientPaymentService } from './patient-payment.service';

@Module({
  imports: [PrismaModule],
  controllers: [PatientPaymentController],
  providers: [PatientPaymentService],
})
export class PatientPaymentModule {}
