import { Module } from '@nestjs/common';
import { StandardMedicalRecordService } from './standard-medical-record.service';
import { StandardMedicalRecordController } from './standard-medical-record.controller';

@Module({
  controllers: [StandardMedicalRecordController],
  providers: [StandardMedicalRecordService],
})
export class StandardMedicalRecordModule {}
