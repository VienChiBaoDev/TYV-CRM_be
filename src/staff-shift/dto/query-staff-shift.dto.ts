import { ClinicBranch } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryStaffShiftDto {
  @IsUUID()
  staffId!: string;

  @IsOptional()
  @IsEnum(ClinicBranch)
  branch?: ClinicBranch;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
