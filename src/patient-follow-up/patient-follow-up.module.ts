import { Module } from '@nestjs/common';
import { PatientFollowUpService } from './patient-follow-up.service';
import { PatientFollowUpController } from './patient-follow-up.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StaffShiftModule } from 'src/staff-shift/staff-shift.module';

@Module({
  imports: [PrismaModule, StaffShiftModule],
  controllers: [PatientFollowUpController],
  providers: [PatientFollowUpService],
})
export class PatientFollowUpModule {}
