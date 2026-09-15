import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { PERMISSIONS } from '../auth/permissions';
import type { JwtPayloadUser } from '../auth/types';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ImportPatientsDto } from './dto/import-patients.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientDetailResponse } from './mappers/patient.mapper';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PATIENTS_WRITE)
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayloadUser) {
    return this.patientService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findAll(@Query() query: QueryPatientDto, @CurrentUser() user: JwtPayloadUser) {
    return this.patientService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.patientService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.PATIENTS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientService.update(id, dto, user);
  }

  // Chi tiết mỗi lần khám của khách hàng
  @Get(':patientId/medical-record')
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findMedicalRecord(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientDetailResponse> {
    return this.patientService.findMedicalRecord(patientId, user);
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.PATIENTS_WRITE)
  importMany(@Body() dto: ImportPatientsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.patientService.importMany(dto, user);
  }
}
