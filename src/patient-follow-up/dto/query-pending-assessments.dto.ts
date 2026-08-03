import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class QueryPendingAssessmentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  clinicId?: string;
}
