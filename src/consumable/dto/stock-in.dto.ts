import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * DTO để nhập số lượng vật tư tiêu hao
 */
export class StockInDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
