import {
  ClinicBranch,
  ClinicalAssessmentResult,
  FollowUpScheduleStatus,
  Patient,
  PatientFollowUp,
} from '@prisma/client';
import { formatDateOnly } from 'src/medical-visit/mappers/visit.mapper';
// Mapper tách biệt Prisma entity và API response; enum FE (số) map sang enum DB (string).

// --- Enum map dùng chung FE ↔ BE ---
export const SCHEDULE_STATUS_TO_FE = {
  SCHEDULED: 1,
  NOT_SCHEDULED: 2,
} as const satisfies Record<FollowUpScheduleStatus, number>;

export const ASSESSMENT_RESULT_TO_FE = {
  GOOD_PROGRESS: 1,
  NORMAL: 2,
  NEED_CONSULTATION: 3,
  GOOD_PROGRESS_ALT: 4,
  CANCELLED: 5,
} as const satisfies Record<ClinicalAssessmentResult, number>;

export const FE_TO_ASSESSMENT_RESULT = {
  1: 'GOOD_PROGRESS',
  2: 'NORMAL',
  3: 'NEED_CONSULTATION',
  4: 'GOOD_PROGRESS_ALT',
  5: 'CANCELLED',
} as const satisfies Record<number, ClinicalAssessmentResult>;

const CLINIC_BRANCH_LABEL: Record<ClinicBranch, string> = {
  HANG_BONG: 'Hàng Bông',
  CAU_GIAY: 'Cầu Giấy',
};

// --- Response types ---
export interface FollowUpScheduleItemResponse {
  readonly id: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly patientCode: string;
  readonly followUpDate: string;
  readonly physicianInCharge: string;
  readonly facility: ClinicBranch;
  readonly facilityLabel: string;
  readonly scheduleStatus: FollowUpScheduleStatus;
  readonly scheduleStatusFe: number;
  readonly originatingVisitId: string;
}
export interface PendingAssessmentItemResponse {
  readonly id: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly assessmentDate: string;
  readonly followUpDate: string;
  readonly physicianInCharge: string;
  readonly assessmentResult: ClinicalAssessmentResult | null;
  readonly assessmentResultFe: number | null;
  readonly assessmentNote: string | null;
}

type FollowUpWithPatient = PatientFollowUp & {
  // Pick lấy ra các field cần thiết từ Patient
  patient: Pick<Patient, 'id' | 'fullName' | 'patientCode'>;
};

type FollowUpWithOriginatingVisit = FollowUpWithPatient & {
  originatingVisit: { visitNumber: number };
};

/** Mỗi bệnh nhân chỉ giữ lịch tái khám từ lần khám mới nhất */
export function keepLatestFollowUpPerPatient<T extends FollowUpWithOriginatingVisit>(
  rows: T[],
): T[] {
  const latestByPatient = new Map<string, T>();

  for (const row of rows) {
    const existing = latestByPatient.get(row.patientId);
    if (
      !existing ||
      row.originatingVisit.visitNumber > existing.originatingVisit.visitNumber
    ) {
      latestByPatient.set(row.patientId, row);
    }
  }

  return Array.from(latestByPatient.values());
}
// Dùng cho Bảng 1: Sắp đến hạn tái khám trong N ngày tới (Không có assessment)
export function mapToScheduleItem(row: FollowUpWithPatient): FollowUpScheduleItemResponse {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient.fullName,
    patientCode: row.patient.patientCode,
    followUpDate: formatDateOnly(row.followUpDate),
    physicianInCharge: row.physicianInCharge,
    facility: row.facility,
    facilityLabel: CLINIC_BRANCH_LABEL[row.facility],
    scheduleStatus: row.scheduleStatus,
    scheduleStatusFe: SCHEDULE_STATUS_TO_FE[row.scheduleStatus],
    originatingVisitId: row.originatingVisitId,
  };
}

// Map từ FollowUpWithPatient sang PendingAssessmentItemResponse (có assessment) (trả về cho danh sách đánh giá chờ)
export function mapToPendingAssessmentItem(
  row: FollowUpWithPatient,
): PendingAssessmentItemResponse {
  return {
    id: row.id,
    patientId: row.patientId,
    patientName: row.patient.fullName,
    assessmentDate: formatDateOnly(row.assessmentDate),
    followUpDate: formatDateOnly(row.followUpDate),
    physicianInCharge: row.physicianInCharge,
    assessmentResult: row.assessmentResult,
    assessmentResultFe: row.assessmentResult ? ASSESSMENT_RESULT_TO_FE[row.assessmentResult] : null,
    assessmentNote: row.assessmentNote,
  };
}

// Helper ngày — dùng UTC giống visit.mapper
export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
export function endOfTodayUtc(): Date {
  const start = startOfTodayUtc();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
// Thêm N ngày vào ngày hôm nay
export function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
