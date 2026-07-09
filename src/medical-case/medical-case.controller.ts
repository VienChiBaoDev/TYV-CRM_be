import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { UpsertMedicalCaseDto } from './dto/upsert-medical-case.dto';
import {
  MedicalCaseResponse,
  MedicalCaseService,
} from './medical-case.service';

@Controller('patients/:patientId/medical-case')
export class MedicalCaseController {
  constructor(private readonly medicalCaseService: MedicalCaseService) {}

  @Get()
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<MedicalCaseResponse | null> {
    return this.medicalCaseService.findByPatient(patientId);
  }

  @Put()
  upsert(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpsertMedicalCaseDto,
  ): Promise<MedicalCaseResponse> {
    return this.medicalCaseService.upsert(patientId, dto.formData);
  }
}
