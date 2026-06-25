import { Module } from '@nestjs/common';
import { PatientFollowUpService } from './patient-follow-up.service';
import { PatientFollowUpController } from './patient-follow-up.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PatientFollowUpController],
  providers: [PatientFollowUpService],
})
export class PatientFollowUpModule {}
