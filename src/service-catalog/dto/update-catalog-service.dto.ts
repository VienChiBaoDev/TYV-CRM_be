import { CatalogServiceStatus, ServiceItemType } from '@prisma/client';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCatalogServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(ServiceItemType)
  itemType?: ServiceItemType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  groupId?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  alternatePrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsEnum(CatalogServiceStatus)
  status?: CatalogServiceStatus;

  @IsOptional()
  @IsNumber()
  minPriceVat?: number;

  @IsOptional()
  @IsNumber()
  maxPriceVat?: number;

  @IsOptional()
  @IsNumber()
  treatmentCount?: number;

  @IsOptional()
  @IsNumber()
  expiryDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;

  @IsOptional()
  @IsDate()
  createdAt?: Date;
}
