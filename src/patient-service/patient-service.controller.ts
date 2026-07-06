import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import { PatientServiceResponse } from './mappers/patient-service.mapper';
import { PatientServiceService } from './patient-service.service';

@Controller('patients/:patientId/services')
export class PatientServiceController {
  constructor(private readonly patientServiceService: PatientServiceService) {}
  // Lấy danh sách dịch vụ của bệnh nhân
  @Get()
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<PatientServiceResponse[]> {
    return this.patientServiceService.findAllByPatient(patientId);
  }
  // Tạo dịch vụ cho bệnh nhân
  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.create(patientId, dto, user.id);
  }

  // Xóa dịch vụ của bệnh nhân
  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<void> {
    return this.patientServiceService.delete(patientId, serviceId);
  }
}
