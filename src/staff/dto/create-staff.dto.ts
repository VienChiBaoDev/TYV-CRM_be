import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ClinicBranch, StaffRole } from '@prisma/client';

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
  @IsEnum(ClinicBranch)
  clinicBranch?: ClinicBranch | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
