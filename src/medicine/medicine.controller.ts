import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { MedicineService } from './medicine.service';

@Controller('medicines')
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Get()
  findAll(@Query() query: QueryMedicineDto) {
    return this.medicineService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.medicineService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMedicineDto) {
    return this.medicineService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicineService.update(id, dto);
  }
}
