import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PatientDetailResponse } from './mappers/patient.mapper';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get(':patientId')
  findMedicalRecord(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<PatientDetailResponse> {
    return this.patientService.findMedicalRecord(patientId);
  }
}
