import { ClinicBranch } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryUpcomingFollowUpsDto {
  @IsOptional()
  @IsEnum(ClinicBranch)
  branch?: ClinicBranch;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  daysAhead?: number = 3;
}
