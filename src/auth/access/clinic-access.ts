import { ForbiddenException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { JwtPayloadUser } from '../types';
import type { PrismaService } from '../../prisma/prisma.service';

/** ADMIN = null (không giới hạn). Non-admin = danh sách clinicId được gán. */
export async function resolveAllowedClinicIds(
  prisma: PrismaService,
  user: JwtPayloadUser,
): Promise<string[] | null> {
  if (user.role === StaffRole.ADMIN) return null;

  const rows = await prisma.staffClinic.findMany({
    where: { staffId: user.id },
    select: { clinicId: true },
  });
  return rows.map((row) => row.clinicId);
}
/**
 * Kiểm tra quyền truy cập cơ sở dữ liệu.
 */
export async function assertClinicAccess(
  prisma: PrismaService,
  user: JwtPayloadUser,
  clinicId: string | undefined | null,
): Promise<void> {
  if (!clinicId) return;

  const allowed = await resolveAllowedClinicIds(prisma, user);
  if (allowed === null) return;
  if (!allowed.includes(clinicId)) {
    throw new ForbiddenException('Bạn không có quyền truy cập cơ sở này');
  }
}
