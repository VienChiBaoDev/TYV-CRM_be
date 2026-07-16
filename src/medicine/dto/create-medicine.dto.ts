import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMedicineDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(50)
  unit!: string;

  // maxDecimalPlaces là số lượng số thập phân tối đa
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
