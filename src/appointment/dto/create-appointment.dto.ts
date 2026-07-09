import { ClinicBranch } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  patientId!: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsISO8601()
  endedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  assistantName?: string;

  @IsOptional()
  @IsEnum(ClinicBranch)
  clinicBranch?: ClinicBranch;

  @IsOptional()
  @IsString()
  note?: string;
}
