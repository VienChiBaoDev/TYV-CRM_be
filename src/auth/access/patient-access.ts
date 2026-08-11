import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { assertClinicAccess } from './clinic-access';
import type { JwtPayloadUser } from '../types';

/** Dữ liệu tối thiểu sau khi pass guard — service có thể dùng clinicId nếu cần. */
export interface PatientAccessRecord {
  readonly id: string;
  readonly clinicId: string;
}
/** Đối tượng phụ trách khách hàng. */
interface PatientAssignment {
  readonly assignedDoctors: ReadonlyArray<{ readonly id: string }>;
  readonly assignedAssistants: ReadonlyArray<{ readonly id: string }>;
}

/** ADMIN: full; còn lại: phải nằm trong danh sách phụ trách. */
export function canAccessPatient(patient: PatientAssignment, user: JwtPayloadUser): boolean {
  if (user.role === StaffRole.ADMIN) return true;

  return (
    patient.assignedDoctors.some((staff) => staff.id === user.id) ||
    patient.assignedAssistants.some((staff) => staff.id === user.id)
  );
}

/**
 * Guard chung cho mọi API theo patientId.
 * Throw 404 / 403 nếu không hợp lệ; trả patient tối thiểu nếu OK.
 */
export async function assertPatientAccess(
  prisma: PrismaService,
  user: JwtPayloadUser,
  patientId: string,
  mode: 'view' | 'edit' = 'view',
): Promise<PatientAccessRecord> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      id: true,
      clinicId: true,
      assignedDoctors: { select: { id: true } },
      assignedAssistants: { select: { id: true } },
    },
  });

  if (!patient) {
    throw new NotFoundException('Không tìm thấy khách hàng');
  }

  if (!canAccessPatient(patient, user)) {
    throw new ForbiddenException(
      mode === 'edit' ? 'Bạn không có quyền sửa hồ sơ này' : 'Bạn không có quyền xem hồ sơ này',
    );
  }

  await assertClinicAccess(prisma, user, patient.clinicId);

  return patient;
}
