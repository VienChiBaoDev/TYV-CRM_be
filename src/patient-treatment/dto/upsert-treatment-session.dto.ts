import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TreatmentSessionConsumableLineDto } from './treatment-session-consumable.dto';

export class UpsertTreatmentSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionNumber!: number;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsOptional()
  @IsUUID()
  ptKtvId?: string;

  @IsOptional()
  @IsString()
  professionalSupport?: string;

  @IsString()
  @MinLength(1, { message: 'Nội dung điều trị không được để trống' })
  treatmentContent!: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  nextContent?: string;

  @IsOptional()
  @IsISO8601()
  nextTreatmentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreatmentSessionConsumableLineDto)
  consumables?: TreatmentSessionConsumableLineDto[];
}
