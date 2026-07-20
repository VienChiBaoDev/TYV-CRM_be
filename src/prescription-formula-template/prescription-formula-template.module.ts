import { Module } from '@nestjs/common';
import { PrescriptionFormulaTemplateController } from './prescription-formula-template.controller';
import { PrescriptionFormulaTemplateService } from './prescription-formula-template.service';

@Module({
  controllers: [PrescriptionFormulaTemplateController],
  providers: [PrescriptionFormulaTemplateService],
})
export class PrescriptionFormulaTemplateModule {}
