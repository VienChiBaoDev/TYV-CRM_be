import { Type } from 'class-transformer';
import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PulseDiagnosisInputDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  huu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bung?: string;
}

/** Body FE gửi lên — BE chỉ forward kèm context CRM sang TYV-CRM_ai. */
export class SuggestPrescriptionDto {
  @IsString()
  @MaxLength(8000)
  symptoms!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bloodPressure?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pulse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  labResults?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PulseDiagnosisInputDto)
  @IsObject()
  pulseDiagnosis?: PulseDiagnosisInputDto;
}
