import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO để điều chỉnh số lượng vật tư tiêu hao
 */
export class StockAdjustDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  newQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
