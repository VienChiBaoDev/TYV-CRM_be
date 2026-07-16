import { CatalogServiceStatus, ServiceItemType } from '@prisma/client';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCatalogServiceDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(ServiceItemType)
  itemType!: ServiceItemType;

  @IsString()
  @MaxLength(500)
  groupId!: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  alternatePrice!: number;

  @IsString()
  @MaxLength(50)
  unit!: string;

  @IsEnum(CatalogServiceStatus)
  status!: CatalogServiceStatus;

  @IsNumber()
  minPriceVat!: number;

  @IsNumber()
  maxPriceVat!: number;

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
