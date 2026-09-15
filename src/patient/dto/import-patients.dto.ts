import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ImportPatientItemDto } from './import-patient-item.dto';

export class ImportPatientsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'File import phải có ít nhất 1 dòng hợp lệ' })
  @ArrayMaxSize(1000, { message: 'Mỗi lần import tối đa 1000 dòng' })
  @ValidateNested({ each: true })
  @Type(() => ImportPatientItemDto)
  items!: ImportPatientItemDto[];
}

export interface ImportPatientsResponse {
  created: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}
