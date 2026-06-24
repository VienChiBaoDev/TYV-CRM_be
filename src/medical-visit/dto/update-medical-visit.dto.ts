import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import {
  CreateMedicalVisitDto,
  CreateVisitBodyDto,
  FollowUpPlanDto,
} from './create-medical-visit.dto';

export class UpdateVisitBodyDto extends PartialType(CreateVisitBodyDto) {}

export class UpdateMedicalVisitDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateVisitBodyDto)
  visit?: UpdateVisitBodyDto;

  @IsOptional()
  @ValidateIf((dto: UpdateMedicalVisitDto) => dto.followUpPlan != null)
  @ValidateNested()
  @Type(() => FollowUpPlanDto)
  followUpPlan?: FollowUpPlanDto | null;
}
