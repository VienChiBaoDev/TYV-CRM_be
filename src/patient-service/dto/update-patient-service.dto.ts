import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientServiceDto } from './create-patient-service.dto';

// PartialType là một utility type thường gặp trong hệ sinh thái NestJS, dùng để tạo một DTO mới mà tất cả các thuộc tính đều trở thành optional.
export class UpdatePatientServiceDto extends PartialType(CreatePatientServiceDto) {}
