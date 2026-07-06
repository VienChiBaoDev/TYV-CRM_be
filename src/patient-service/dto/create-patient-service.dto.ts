import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreatePatientServiceDto {
  @IsUUID()
  catalogServiceId!: string;

  @IsUUID()
  consultantId!: string;

  @IsOptional()
  @IsUUID()
  telesaleId?: string;

  @Type(() => Number)
  @Min(0)
  unitPrice!: number;

  @Type(() => Number)
  @Min(0)
  vatPercent!: number;

  @Type(() => Number)
  @Min(0)
  vatAmount!: number;

  @Type(() => Number)
  @Min(0)
  unitPriceAfterVat!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Type(() => Number)
  @Min(0)
  discount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  treatmentCount!: number;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
