import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password!: string;

  @IsString()
  @MaxLength(255)
  fullName!: string;

  @IsEnum(StaffRole, { message: 'Vai trò không hợp lệ' })
  role!: StaffRole;

  @IsOptional()
  @ValidateIf((_o, value) => value != null)
  @IsUUID()
  clinicId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
