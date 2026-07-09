import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export const PATIENT_PAYMENT_METHOD = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type PatientPaymentMethodDto =
  (typeof PATIENT_PAYMENT_METHOD)[keyof typeof PATIENT_PAYMENT_METHOD];

// Patient Payment Line là để tạo dữ liệu cho bảng patient_payment_line
// bảng này là bảng liên kết giữa patient_payment và patient_service_record
// ví dụ: một hóa đơn có nhiều dịch vụ, mỗi dịch vụ có một id riêng biệt
// nên ta cần tạo dữ liệu cho bảng này
// đây là bảng này sẽ được tạo khi tạo hóa đơn, hiển thị dữ liệu dịch vụ trong hóa đơn
export class CreatePatientPaymentLineDto {
  @IsUUID()
  patientServiceRecordId!: string;

  @Type(() => Number)
  @Min(1)
  amount!: number;
}

export class CreatePatientPaymentDto {
  @IsIn([PATIENT_PAYMENT_METHOD.CASH, PATIENT_PAYMENT_METHOD.BANK_TRANSFER])
  paymentMethod!: PatientPaymentMethodDto;

  @IsOptional()
  @IsString()
  paymentDetail?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsString()
  branch!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsISO8601()
  createdAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  // validateNested là để validate dữ liệu cho bảng patient_payment_line
  // each: true là để validate từng dữ liệu trong mảng
  @ValidateNested({ each: true })
  @Type(() => CreatePatientPaymentLineDto)
  items!: CreatePatientPaymentLineDto[];
}
