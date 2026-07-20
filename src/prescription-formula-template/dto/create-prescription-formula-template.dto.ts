import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrescriptionFormulaHerbDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(100)
  weight!: string;

  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  decoctionOrder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  decoctionPrep?: string;
}

export class CreatePrescriptionFormulaTemplateDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  dosage?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Công thức phải có ít nhất 1 vị thuốc' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionFormulaHerbDto)
  herbs!: PrescriptionFormulaHerbDto[];
}
