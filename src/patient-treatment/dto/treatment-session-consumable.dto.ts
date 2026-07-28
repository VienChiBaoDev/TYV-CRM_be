import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class TreatmentSessionConsumableLineDto {
  @IsUUID()
  consumableId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}
