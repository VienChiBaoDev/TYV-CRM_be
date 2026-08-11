import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayloadUser } from '../auth/types';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import { PatientServiceResponse } from './mappers/patient-service.mapper';
import { PatientServiceService } from './patient-service.service';
import { UpdatePatientServiceDto } from './dto/update-patient-service.dto';

@Controller('patients/:patientId/services')
export class PatientServiceController {
  constructor(private readonly patientServiceService: PatientServiceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SERVICES_READ)
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse[]> {
    return this.patientServiceService.findAllByPatient(patientId, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SERVICES_WRITE)
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.create(patientId, dto, user);
  }

  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.SERVICES_WRITE)
  delete(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<void> {
    return this.patientServiceService.delete(patientId, serviceId, user);
  }

  @Patch(':serviceId/cancel')
  @RequirePermissions(PERMISSIONS.SERVICES_WRITE)
  cancel(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.cancel(patientId, serviceId, user);
  }

  @Patch(':serviceId')
  @RequirePermissions(PERMISSIONS.SERVICES_WRITE)
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.update(patientId, serviceId, dto, user);
  }
}
