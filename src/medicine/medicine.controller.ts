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
  Query,
} from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineService } from './medicine.service';
import { ImportMedicinesDto } from './dto/import-medicines.dto';

@Controller('medicines')
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.MEDICINES_READ)
  findAll(@Query() query: QueryMedicineDto) {
    return this.medicineService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.MEDICINES_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.medicineService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.MEDICINES_WRITE)
  create(@Body() dto: CreateMedicineDto) {
    return this.medicineService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.MEDICINES_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicineService.update(id, dto);
  }

  @Post('import')
  @RequirePermissions(PERMISSIONS.MEDICINES_WRITE)
  importMany(@Body() dto: ImportMedicinesDto) {
    return this.medicineService.importMany(dto);
  }
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.MEDICINES_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.medicineService.remove(id);
  }
}
