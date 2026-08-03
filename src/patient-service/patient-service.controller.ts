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
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import { PatientServiceResponse } from './mappers/patient-service.mapper';
import { PatientServiceService } from './patient-service.service';
import { UpdatePatientServiceDto } from './dto/update-patient-service.dto';

@Controller('patients/:patientId/services')
export class PatientServiceController {
  constructor(private readonly patientServiceService: PatientServiceService) {}

  @Get()
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse[]> {
    return this.patientServiceService.findAllByPatient(patientId, user);
  }

  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.create(patientId, dto, user);
  }

  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<void> {
    return this.patientServiceService.delete(patientId, serviceId, user);
  }

  @Patch(':serviceId/cancel')
  cancel(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.cancel(patientId, serviceId, user);
  }

  @Patch(':serviceId')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.update(patientId, serviceId, dto, user);
  }
}
