import { Module } from '@nestjs/common';
import { PatientFollowUpService } from './patient-follow-up.service';
import { PatientFollowUpController } from './patient-follow-up.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffShiftModule } from 'src/staff-shift/staff-shift.module';
import { AppointmentModule } from 'src/appointment/appointment.module';

@Module({
  imports: [PrismaModule, StaffShiftModule, AppointmentModule],
  controllers: [PatientFollowUpController],
  providers: [PatientFollowUpService],
})
export class PatientFollowUpModule {}
