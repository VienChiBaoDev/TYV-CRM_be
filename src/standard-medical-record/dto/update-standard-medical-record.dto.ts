import { PartialType } from '@nestjs/mapped-types';
import { CreateStandardMedicalRecordDto } from './create-standard-medical-record.dto';

export class UpdateStandardMedicalRecordDto extends PartialType(CreateStandardMedicalRecordDto) {}
