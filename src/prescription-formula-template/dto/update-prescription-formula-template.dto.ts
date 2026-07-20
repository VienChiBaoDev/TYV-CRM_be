import { PartialType } from '@nestjs/mapped-types';
import { CreatePrescriptionFormulaTemplateDto } from './create-prescription-formula-template.dto';

export class UpdatePrescriptionFormulaTemplateDto extends PartialType(
  CreatePrescriptionFormulaTemplateDto,
) {}
