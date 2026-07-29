import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class QueryStaffShiftDto {
  @IsUUID()
  staffId!: string;

  @IsOptional()
  @IsUUID()
  clinicId?: string;

  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}
