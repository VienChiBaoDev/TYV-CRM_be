import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
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
  @IsArray()
  @IsUUID('4', { each: true })
  clinicIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Snapshot quyền; omit = dùng mặc định theo role. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionCodes?: string[];
}
