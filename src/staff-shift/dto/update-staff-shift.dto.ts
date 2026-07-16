import { ClinicBranch, StaffShiftType } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStaffShiftDto {
  @IsOptional()
  @IsEnum(ClinicBranch)
  clinicBranch?: ClinicBranch;

  @IsOptional()
  @IsEnum(StaffShiftType)
  type?: StaffShiftType;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
