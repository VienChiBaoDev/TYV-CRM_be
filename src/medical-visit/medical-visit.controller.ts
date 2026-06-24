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
import { CreateMedicalVisitDto } from './dto/create-medical-visit.dto';
import { UpdateMedicalVisitDto } from './dto/update-medical-visit.dto';
import { MedicalVisitResponse } from './mappers/visit.mapper';
import { MedicalVisitService } from './medical-visit.service';

@Controller('patients/:patientId/visits')
export class MedicalVisitController {
  constructor(private readonly medicalVisitService: MedicalVisitService) {}

  @Get()
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<MedicalVisitResponse[]> {
    return this.medicalVisitService.findAllByPatient(patientId);
  }

  @Get(':visitId')
  findOne(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.findOne(patientId, visitId);
  }

  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.create(patientId, dto);
  }

  @Patch(':visitId')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.update(patientId, visitId, dto);
  }

  @Delete(':visitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ): Promise<void> {
    await this.medicalVisitService.remove(patientId, visitId);
  }
}
