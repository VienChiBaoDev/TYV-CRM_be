import { ClinicBranch } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class QueryPendingAssessmentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClinicBranch)
  branch?: ClinicBranch;
}
