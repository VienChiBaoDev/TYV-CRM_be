import { IsObject } from 'class-validator';

export class UpsertMedicalCaseDto {
  @IsObject()
  formData!: Record<string, unknown>;
}
