import { ClinicalAssessmentResult } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAssessmentDto {
  @IsEnum(ClinicalAssessmentResult)
  assessmentResult!: ClinicalAssessmentResult;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  assessmentNote?: string;
}
