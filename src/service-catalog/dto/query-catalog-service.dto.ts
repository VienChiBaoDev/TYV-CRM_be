import { CatalogServiceStatus, ServiceItemType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryCatalogServiceDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CatalogServiceStatus)
  status?: CatalogServiceStatus;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsEnum(ServiceItemType)
  itemType?: ServiceItemType;
}
