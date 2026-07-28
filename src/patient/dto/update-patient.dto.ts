import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';

// Tất cả field thành optional — cho phép sửa từng phần hồ sơ khách hàng.
export class UpdatePatientDto extends PartialType(CreatePatientDto) {}
