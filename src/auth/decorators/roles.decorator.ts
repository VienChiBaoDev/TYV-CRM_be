import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Giới hạn route cho các role cụ thể. Dùng kèm RolesGuard (đã đăng ký toàn cục). */
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
