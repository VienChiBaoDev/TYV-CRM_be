import type { PatientTreatmentSession, PatientTreatmentSessionImage, Staff } from '@prisma/client';
import { formatDisplayDatetime } from '../../common/mapper-utils';
import type { TreatmentSessionConsumable } from '@prisma/client';

type SessionWithStaff = PatientTreatmentSession & {
  doctor: Pick<Staff, 'fullName'> | null;
  ptKtv: Pick<Staff, 'fullName'> | null;
  performedBy: Pick<Staff, 'fullName'> | null;
  images: PatientTreatmentSessionImage[];
  consumables: TreatmentSessionConsumable[];
};
/**
 * interface response cho hình ảnh điều trị
 */
export interface TreatmentSessionImageResponse {
  readonly id: string;
  readonly imageUrl: string;
  readonly sortOrder: number;
}

export interface TreatmentSessionConsumableResponse {
  readonly id: string;
  readonly consumableId: string;
  readonly name: string;
  readonly unit: string;
  readonly quantity: number;
}

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
  readonly images: TreatmentSessionImageResponse[];
  readonly consumables: TreatmentSessionConsumableResponse[];
  readonly hasConsumables: boolean;
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
  readonly sessionTotal: number;
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
    images: session.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      sortOrder: image.sortOrder,
    })),
    consumables: session.consumables.map((c) => ({
      id: c.id,
      consumableId: c.consumableId,
      name: c.nameSnapshot,
      unit: c.unitSnapshot,
      quantity: Number(c.quantity),
    })),
    hasConsumables: session.consumables.length > 0,
  };
}
