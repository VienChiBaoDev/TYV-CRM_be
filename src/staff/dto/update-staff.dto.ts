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

export class UpdateStaffDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  /** Để trống nếu không đổi mật khẩu. */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsEnum(StaffRole, { message: 'Vai trò không hợp lệ' })
  role?: StaffRole;

  @IsOptional()
  @ValidateIf((_o, value) => value != null)
  @IsUUID()
  clinicId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
