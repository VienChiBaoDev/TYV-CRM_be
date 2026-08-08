import { Injectable } from '@nestjs/common';
import { Prisma, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import {
  getRoleDefaultPermissions,
  normalizePermissionCodes,
  type PermissionCode,
} from './permissions';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PermissionsService {
  /** ponytail: in-process cache — invalidate on replaceForStaff / clearStaffCache */
  private readonly cache = new Map<string, PermissionCode[]>();

  constructor(private readonly prisma: PrismaService) {}

  clearStaffCache(staffId: string): void {
    this.cache.delete(staffId);
  }

  async getForStaff(staffId: string, role: StaffRole): Promise<PermissionCode[]> {
    if (role === StaffRole.ADMIN) {
      return getRoleDefaultPermissions(StaffRole.ADMIN);
    }

    const cached = this.cache.get(staffId);
    if (cached) return cached;

    const existing = await this.readCodes(staffId);
    if (existing.length > 0) {
      this.cache.set(staffId, existing);
      return existing;
    }

    const defaults = getRoleDefaultPermissions(role);
    await this.prisma.$transaction(async (tx) => {
      const again = await tx.staffPermission.findMany({
        where: { staffId },
        select: { permissionCode: true },
      });
      if (again.length > 0) return;
      await this.replaceForStaff(tx, staffId, defaults);
    }, PRISMA_TRANSACTION_OPTIONS);

    const after = await this.readCodes(staffId);
    const result = after.length > 0 ? after : defaults;
    this.cache.set(staffId, result);
    return result;
  }

  async replaceForStaff(
    db: PrismaService | TxClient,
    staffId: string,
    codes: PermissionCode[],
  ): Promise<void> {
    const unique = [...new Set(codes)];
    await db.staffPermission.deleteMany({ where: { staffId } });
    if (unique.length === 0) return;
    await db.staffPermission.createMany({
      data: unique.map((permissionCode) => ({ staffId, permissionCode })),
      skipDuplicates: true,
    });
  }

  resolveIncomingCodes(role: StaffRole, permissionCodes: string[] | undefined): PermissionCode[] {
    return normalizePermissionCodes(permissionCodes, role);
  }

  private async readCodes(staffId: string): Promise<PermissionCode[]> {
    const rows = await this.prisma.staffPermission.findMany({
      where: { staffId },
      select: { permissionCode: true },
    });
    return rows.map((row) => row.permissionCode as PermissionCode);
  }
}
