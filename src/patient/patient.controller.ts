import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ClinicBranch } from '@prisma/client';
import { CreatePatientDto } from './dto/create-patient.dto';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('branch') branch?: ClinicBranch,
    @Query('referrerId') referrerId?: string,
  ) {
    return this.patientService.findAll({ search, branch, referrerId });
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patientService.findOne(id);
  }
}
