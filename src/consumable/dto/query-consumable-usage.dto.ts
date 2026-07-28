import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO để query lịch sử sử dụng vật tư tiêu hao
 */
export class QueryConsumableUsageDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsUUID()
  consumableId?: string;
}
