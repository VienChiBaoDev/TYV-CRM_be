import { ClinicBranch, Gender } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  source?: string;

  @IsOptional()
  @IsEnum(ClinicBranch)
  clinicBranch?: ClinicBranch;

  @IsOptional()
  @IsUUID()
  referrerId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  assignedStaffIds?: string[];
}
