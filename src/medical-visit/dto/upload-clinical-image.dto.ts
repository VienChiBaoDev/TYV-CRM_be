import { ClinicalImageCategory } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadClinicalImageDto {
  @IsEnum(ClinicalImageCategory)
  category!: ClinicalImageCategory;
}
