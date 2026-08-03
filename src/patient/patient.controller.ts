import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientDetailResponse } from './mappers/patient.mapper';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: JwtPayloadUser) {
    return this.patientService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query('search') search?: string,
    @Query('clinicId') clinicId?: string,
    @Query('referrerId') referrerId?: string,
  ) {
    return this.patientService.findAll({ search, clinicId, referrerId }, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientService.update(id, dto, user);
  }

  // Chi tiết mỗi lần khám của khách hàng
  @Get(':patientId/medical-record')
  findMedicalRecord(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientDetailResponse> {
    return this.patientService.findMedicalRecord(patientId, user);
  }
}
