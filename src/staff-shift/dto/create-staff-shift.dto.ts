import { StaffShiftType } from '@prisma/client';
import { ClinicBranch } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStaffShiftDto {
  @IsUUID()
  staffId!: string;

  @IsEnum(ClinicBranch)
  clinicBranch!: ClinicBranch;

  @IsEnum(StaffShiftType)
  type!: StaffShiftType;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string;
}
