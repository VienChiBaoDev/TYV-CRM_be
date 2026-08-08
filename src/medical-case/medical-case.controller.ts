import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UpsertMedicalCaseDto } from './dto/upsert-medical-case.dto';
import {
  MedicalCaseResponse,
  MedicalCaseService,
} from './medical-case.service';

@Controller('patients/:patientId/medical-case')
export class MedicalCaseController {
  constructor(private readonly medicalCaseService: MedicalCaseService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalCaseResponse | null> {
    return this.medicalCaseService.findByPatient(patientId, user);
  }

  @Put()
  @RequirePermissions(PERMISSIONS.VISITS_WRITE)
  upsert(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpsertMedicalCaseDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalCaseResponse> {
    return this.medicalCaseService.upsert(patientId, dto.formData, user);
  }
}
