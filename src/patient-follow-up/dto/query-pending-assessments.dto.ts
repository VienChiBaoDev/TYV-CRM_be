import { ClinicBranch } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class QueryPendingAssessmentsDto {
  @IsOptional()
  @IsEnum(ClinicBranch)
  branch?: ClinicBranch;
}
