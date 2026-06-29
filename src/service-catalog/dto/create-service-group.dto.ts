import { ServiceItemType } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateServiceGroupDto {
  @IsString()
  @MaxLength(20)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEnum(ServiceItemType)
  itemType!: ServiceItemType;
}
