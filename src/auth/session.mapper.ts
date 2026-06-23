import type { User } from '@prisma/client';
import type { AppRole } from './contract-type-to-role';
import type { StaffLevel } from '../users/users.service';
import { roleFromContractType } from './contract-type-to-role';
import { uuidFromSeed } from './uuid-from-seed';
import { buildTeamIdsForUser } from '../employees/user-team-memberships';
import type { SessionPermission } from '../permissions/legacy-map';
import { permissionIdsToLegacyPermissions } from '../permissions/legacy-map';

export type { SessionPermission };

export type UserSessionDto = {
  id: string;
  name: string;
  email: string;
  /** Khớp OpenAPI / FE (`HR`). */
  role: AppRole;
  roles?: AppRole[];
  permissions: SessionPermission[];
  permissionIds?: string[];
  dataScopeFlags?: Record<string, boolean>;
  departmentId: string;
  teamIds: string[];
  staffLevel: StaffLevel;
  jobTitle?: string;
  team?: string;
  portraitRef?: string;
};

function sessionRoles(primary: AppRole, isAssignedClassTeacher: boolean): AppRole[] {
  if (isAssignedClassTeacher && primary !== 'TEACHER') {
    return [primary, 'TEACHER'];
  }
  return [primary];
}

export function userToSession(
  user: User & { appProfile?: { avatarUrl?: string | null } | null },
  canonicalEmail: string,
  resolvedRole?: AppRole,
  effective?: { permissionIds: string[]; dataScopeFlags: Record<string, boolean> },
  staffLevel: StaffLevel = 'UNKNOWN',
  options?: { isAssignedClassTeacher?: boolean; teamName?: string | null },
): UserSessionDto {
  const appRole = resolvedRole ?? roleFromContractType(user.jobTitle);
  const role = appRole;
  const isAssignedClassTeacher = Boolean(options?.isAssignedClassTeacher);
  const roles = sessionRoles(appRole, isAssignedClassTeacher);
  const name =
    user.displayName?.trim() ||
    user.fullNameLegal?.trim() ||
    canonicalEmail.split('@')[0] ||
    'User';
  /** FE KPI/org tree dùng division làm “phòng ban”; legacy `departmentId` chỉ fallback. */
  const deptId = user.divisionId ?? user.departmentId ?? uuidFromSeed(`dept:none`);
  const teamIds = buildTeamIdsForUser(user);

  const permissionIds = effective?.permissionIds ?? [];
  const flags = effective?.dataScopeFlags ?? {};
  const dataScopeFlags = Object.keys(flags).length > 0 ? flags : undefined;

  return {
    id: user.id,
    name,
    email: canonicalEmail,
    role,
    roles,
    permissions: permissionIdsToLegacyPermissions(permissionIds),
    permissionIds: permissionIds.length > 0 ? permissionIds : undefined,
    dataScopeFlags,
    departmentId: deptId,
    teamIds,
    staffLevel,
    jobTitle: user.jobTitle || undefined,
    team: options?.teamName || undefined,
    portraitRef: user.appProfile?.avatarUrl || undefined,
  };
}
