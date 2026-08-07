import { StaffRole } from '@prisma/client';

/** Fixed permission catalog — keep in sync with FE `constants/permissions.ts`. */
/**
 * as const để đảm bảo rằng các giá trị trong PERMISSIONS là const và không thể bị thay đổi
 * khác gì với enum, enum thì không thể bị thay đổi sau khi được khai báo nhưng có thể thêm giá trị mới
 */
export const PERMISSIONS = {
  PATIENTS_READ: 'patients:read',
  PATIENTS_WRITE: 'patients:write',
  VISITS_WRITE: 'visits:write',
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_WRITE: 'appointments:write',
  SERVICES_READ: 'services:read',
  SERVICES_WRITE: 'services:write',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  TREATMENT_WRITE: 'treatment:write',
  FOLLOWUPS_WRITE: 'followups:write',
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  MEDICINES_READ: 'medicines:read',
  MEDICINES_WRITE: 'medicines:write',
  FORMULAS_READ: 'formulas:read',
  FORMULAS_WRITE: 'formulas:write',
  CONSUMABLES_READ: 'consumables:read',
  CONSUMABLES_WRITE: 'consumables:write',
  SHIFTS_READ: 'shifts:read',
  SHIFTS_WRITE: 'shifts:write',
  REFERRERS_WRITE: 'referrers:write',
  SETTINGS_STAFF: 'settings:staff',
  SETTINGS_CLINICS: 'settings:clinics',
  SETTINGS_BANKS: 'settings:banks',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

const OPS_READ_WRITE: PermissionCode[] = [
  PERMISSIONS.PATIENTS_READ,
  PERMISSIONS.PATIENTS_WRITE,
  PERMISSIONS.VISITS_WRITE,
  PERMISSIONS.APPOINTMENTS_READ,
  PERMISSIONS.APPOINTMENTS_WRITE,
  PERMISSIONS.SERVICES_READ,
  PERMISSIONS.SERVICES_WRITE,
  PERMISSIONS.PAYMENTS_READ,
  PERMISSIONS.TREATMENT_WRITE,
  PERMISSIONS.FOLLOWUPS_WRITE,
  PERMISSIONS.CATALOG_READ,
  PERMISSIONS.MEDICINES_READ,
  PERMISSIONS.FORMULAS_READ,
  PERMISSIONS.CONSUMABLES_READ,
  PERMISSIONS.SHIFTS_READ,
];

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, PermissionCode[]> = {
  ADMIN: [...ALL_PERMISSION_CODES],
  DOCTOR: [...OPS_READ_WRITE],
  ASSISTANT: [...OPS_READ_WRITE],
  STAFF: [
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_WRITE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_WRITE,
    PERMISSIONS.SERVICES_READ,
    PERMISSIONS.SERVICES_WRITE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_WRITE,
    PERMISSIONS.FOLLOWUPS_WRITE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.MEDICINES_READ,
    PERMISSIONS.FORMULAS_READ,
    PERMISSIONS.CONSUMABLES_READ,
    PERMISSIONS.CONSUMABLES_WRITE,
    PERMISSIONS.SHIFTS_READ,
    PERMISSIONS.REFERRERS_WRITE,
  ],
};

export function getRoleDefaultPermissions(role: StaffRole): PermissionCode[] {
  return [...ROLE_DEFAULT_PERMISSIONS[role]];
}

/**
 *
 * @param value là một chuỗi, mỗi chuỗi là một permission code
 * @returns là một boolean
 * nếu value là một permission code thì trả về true
 * nếu value không phải là một permission code thì trả về false
 */
export function isPermissionCode(value: string): value is PermissionCode {
  return (ALL_PERMISSION_CODES as string[]).includes(value);
}
/**
 * Hàm chuẩn hóa input từ API/form
 * @param codes là một mảng các chuỗi, mỗi chuỗi là một permission code
 * @param role là vai trò của nhân viên
 * @returns là một mảng các permission code
 * nếu role là ADMIN thì trả về tất cả các permission code
 * nếu codes là undefined thì trả về các permission code mặc định của role
 * nếu codes không phải là một mảng các chuỗi thì trả về một mảng rỗng
 * nếu codes là một mảng các chuỗi thì trả về một mảng các permission code
 */
export function normalizePermissionCodes(
  codes: string[] | undefined,
  role: StaffRole,
): PermissionCode[] {
  if (role === StaffRole.ADMIN) {
    return getRoleDefaultPermissions(StaffRole.ADMIN);
  }
  if (codes === undefined) {
    return getRoleDefaultPermissions(role);
  }
  // sử dụng filter để lọc các permission code không hợp lệ
  // sử dụng Set để loại bỏ các permission code trùng lặp
  // sử dụng spread operator để trả về một mảng mới
  const unique = [...new Set(codes.filter(isPermissionCode))];
  // const unique = [
  //   ...new Set(
  //     codes.filter((code) => {
  //       return isPermissionCode(code);
  //     }),
  //   ),
  // ];
  // trả về các permission code không trùng lặp
  return unique;
}
