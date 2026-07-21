import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  bankName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  accountHolder!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  accountNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
