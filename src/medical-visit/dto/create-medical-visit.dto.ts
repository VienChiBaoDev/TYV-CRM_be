import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { VisitMode, VisitStatus } from '@prisma/client';
import { TreatmentStatusApi } from '../mappers/visit.mapper';

export class PulseDiagnosisDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  huu?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bung?: string;
}

export class VisitHerbDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(100)
  weight!: string;

  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lineTotal?: number;
}

export class VisitClinicalImageDto {
  @IsString()
  @MaxLength(2000)
  imageUrl!: string;
}

export class FollowUpPlanDto {
  @IsDateString()
  followUpDate!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  reminderDaysBefore!: number;

  @IsIn(['IN_TREATMENT', 'EXAMINING', 'COMPLETED'])
  treatmentStatus!: TreatmentStatusApi;
}

export class CreateVisitBodyDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsDateString()
  visitDate!: string;

  @IsString()
  @MaxLength(200)
  doctorName!: string;

  @IsEnum(VisitMode)
  mode!: VisitMode;

  @IsString()
  @MaxLength(200)
  location!: string;

  @IsEnum(VisitStatus)
  status!: VisitStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bloodPressure?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pulse?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  symptoms?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PulseDiagnosisDto)
  pulseDiagnosis?: PulseDiagnosisDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prescriptionFormula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  prescriptionDosage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  labResults?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitHerbDto)
  herbs?: VisitHerbDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitClinicalImageDto)
  clinicalImages?: VisitClinicalImageDto[];
}

export class CreateMedicalVisitDto {
  @ValidateNested()
  @Type(() => CreateVisitBodyDto)
  visit!: CreateVisitBodyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FollowUpPlanDto)
  followUpPlan?: FollowUpPlanDto;
}
