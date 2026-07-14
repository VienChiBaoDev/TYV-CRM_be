import type { PatientTreatmentSession, Staff } from '@prisma/client';
import { formatDisplayDatetime } from '../../common/mapper-utils';

type SessionWithStaff = PatientTreatmentSession & {
  doctor: Pick<Staff, 'fullName'> | null;
  ptKtv: Pick<Staff, 'fullName'> | null;
  performedBy: Pick<Staff, 'fullName'> | null;
};

/**
 * interface response cho chức năng hiển thị danh sách điều trị chi tiết
 */
export interface TreatmentSessionResponse {
  readonly id: string;
  readonly sessionNumber: number;
  readonly doctorId: string | null;
  readonly doctorName: string | null;
  readonly ptKtvId: string | null;
  readonly ptKtvName: string | null;
  readonly professionalSupport: string | null;
  readonly treatmentContent: string;
  readonly note: string | null;
  readonly nextContent: string | null;
  readonly nextTreatmentDate: string | null;
  readonly performedAt: string;
  readonly performedByName: string | null;
}

/**
 * interface response cho màn hình hiển thị danh sách điều trị chi tiết
 */
export interface TreatmentSessionListResponse {
  readonly service: {
    readonly id: string;
    readonly serviceName: string;
    readonly sessionTotal: number;
    readonly completedSessions: number;
    readonly maxAllowedSession: number;
  };
  readonly sessions: TreatmentSessionResponse[];
}

/**
 * interface response cho màn hình hiển thị lịch sử điều trị
 */
export interface TreatmentHistoryItemResponse {
  readonly id: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly sessionNumber: number;
  readonly treatmentContent: string;
  readonly performedAt: string;
  readonly doctorName: string | null;
  readonly ptKtvName: string | null;
  readonly status: 'IN_PROGRESS' | 'COMPLETED';
}

/**
 * Map session to TreatmentSessionResponse
 */
export function mapTreatmentSessionToResponse(session: SessionWithStaff): TreatmentSessionResponse {
  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    doctorId: session.doctorId,
    doctorName: session.doctor?.fullName ?? null,
    ptKtvId: session.ptKtvId,
    ptKtvName: session.ptKtv?.fullName ?? null,
    professionalSupport: session.professionalSupport,
    treatmentContent: session.treatmentContent,
    note: session.note,
    nextContent: session.nextContent,
    nextTreatmentDate: session.nextTreatmentDate
      ? formatDisplayDatetime(session.nextTreatmentDate)
      : null,
    performedAt: formatDisplayDatetime(session.performedAt),
    performedByName: session.performedBy?.fullName ?? null,
  };
}
