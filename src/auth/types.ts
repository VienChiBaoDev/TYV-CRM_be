import type { Staff } from '@prisma/client';
import type { PermissionCode } from './permissions';

/** JWT payload gắn vào request sau khi JwtAuthGuard verify. */
export interface JwtPayloadUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  permissions?: PermissionCode[];
}

/** User trả về cho FE sau login /me. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Staff['role'];
  clinicIds: string[];
  allClinics: boolean;
  permissions: PermissionCode[];
}
