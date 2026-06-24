import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StandardMedicalRecordService } from './standard-medical-record.service';
import { CreateStandardMedicalRecordDto } from './dto/create-standard-medical-record.dto';
import { UpdateStandardMedicalRecordDto } from './dto/update-standard-medical-record.dto';

@Controller('standard-medical-record')
export class StandardMedicalRecordController {
  constructor(private readonly standardMedicalRecordService: StandardMedicalRecordService) {}

  @Post()
  create(@Body() createStandardMedicalRecordDto: CreateStandardMedicalRecordDto) {
    return this.standardMedicalRecordService.create(createStandardMedicalRecordDto);
  }

  @Get()
  findAll() {
    return this.standardMedicalRecordService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.standardMedicalRecordService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStandardMedicalRecordDto: UpdateStandardMedicalRecordDto) {
    return this.standardMedicalRecordService.update(+id, updateStandardMedicalRecordDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.standardMedicalRecordService.remove(+id);
  }
}
