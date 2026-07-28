import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PATIENT_PAYMENT_METHOD, PatientPaymentMethodDto } from './create-patient-payment.dto';

export const REFUND_REASON = {
  CANNOT_TREAT: 'cannot_treat',
  CHANGE_PLAN: 'change_plan',
  OVERPAID: 'overpaid',
  OTHER: 'other',
} as const;

export class CreatePatientRefundLineDto {
  @IsUUID()
  patientServiceRecordId!: string;

  @Type(() => Number)
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsBoolean()
  lockService?: boolean;
}

export class CreatePatientRefundDto {
  @IsIn([PATIENT_PAYMENT_METHOD.CASH, PATIENT_PAYMENT_METHOD.BANK_TRANSFER])
  paymentMethod!: PatientPaymentMethodDto;

  @IsIn(Object.values(REFUND_REASON))
  reason!: string;

  @IsOptional()
  @IsString()
  paymentDetail?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  /** Tài khoản ngân hàng nhận tiền — chọn từ danh sách khai báo ở màn Cài đặt. */
  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

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
  @ValidateNested({ each: true })
  @Type(() => CreatePatientRefundLineDto)
  items!: CreatePatientRefundLineDto[];
}
