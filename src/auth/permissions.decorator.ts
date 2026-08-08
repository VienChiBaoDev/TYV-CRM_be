import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from './permissions';

export const PERMISSIONS_KEY = 'permissions';

/** Require all listed permissions. Empty / absent = pass-through. */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
