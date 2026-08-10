import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateMedicineDto } from './create-medicine.dto';

export class ImportMedicinesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'File import phải có ít nhất 1 dòng hợp lệ' })
  @ArrayMaxSize(1000, { message: 'Mỗi lần import tối đa 1000 dòng' })
  @ValidateNested({ each: true })
  @Type(() => CreateMedicineDto)
  items!: CreateMedicineDto[];
}
