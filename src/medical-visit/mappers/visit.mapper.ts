import {
  ClinicBranch,
  ClinicalImageCategory,
  CustomerStatus,
  MedicalVisit,
  PatientFollowUp,
  VisitClinicalImage,
  VisitHerb,
  VisitMode,
  VisitStatus,
} from '@prisma/client';

export const TREATMENT_STATUS_TO_CUSTOMER_STATUS = {
  IN_TREATMENT: CustomerStatus.IN_TREATMENT,
  EXAMINING: CustomerStatus.EXAMINING,
  COMPLETED: CustomerStatus.COMPLETED,
} as const satisfies Record<string, CustomerStatus>;

export type TreatmentStatusApi = keyof typeof TREATMENT_STATUS_TO_CUSTOMER_STATUS;

const LOCATION_TO_CLINIC_BRANCH: Record<string, ClinicBranch> = {
  HANG_BONG: ClinicBranch.HANG_BONG,
  'Hàng Bông': ClinicBranch.HANG_BONG,
  'Hang Bong': ClinicBranch.HANG_BONG,
  CAU_GIAY: ClinicBranch.CAU_GIAY,
  'Cầu Giấy': ClinicBranch.CAU_GIAY,
  'Cau Giay': ClinicBranch.CAU_GIAY,
};

export function parseDateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function subtractDays(isoDate: string, days: number): Date {
  const date = parseDateOnly(isoDate);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

export function computeReminderDaysBefore(
  followUpDate: Date,
  assessmentDate: Date,
): number {
  const diffMs = followUpDate.getTime() - assessmentDate.getTime();
  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function resolveClinicBranchFromLocation(location: string): ClinicBranch {
  return LOCATION_TO_CLINIC_BRANCH[location] ?? ClinicBranch.HANG_BONG;
}

export function toCustomerStatus(treatmentStatus: TreatmentStatusApi): CustomerStatus {
  return TREATMENT_STATUS_TO_CUSTOMER_STATUS[treatmentStatus];
}

export interface VisitHerbResponse {
  readonly id: string;
  readonly name: string;
  readonly weight: string;
  readonly sortOrder: number;
}

export interface VisitClinicalImageResponse {
  readonly id: string;
  readonly imageUrl: string;
  readonly category: ClinicalImageCategory;
  readonly sortOrder: number;
}

export interface FollowUpPlanResponse {
  readonly id: string;
  readonly followUpDate: string;
  readonly assessmentDate: string;
  readonly reminderDaysBefore: number;
  readonly physicianInCharge: string;
  readonly facility: ClinicBranch;
  readonly scheduleStatus: PatientFollowUp['scheduleStatus'];
  readonly assessmentResult: PatientFollowUp['assessmentResult'];
  readonly assessmentNote: string | null;
  readonly assessedAt: string | null;
}

export interface MedicalVisitResponse {
  readonly id: string;
  readonly patientId: string;
  readonly visitNumber: number;
  readonly title: string;
  readonly visitDate: string;
  readonly doctorName: string;
  readonly mode: VisitMode;
  readonly location: string;
  readonly bloodPressure: string | null;
  readonly pulse: string | null;
  readonly symptoms: string | null;
  readonly pulseDiagnosis: {
    readonly ta: string | null;
    readonly huu: string | null;
    readonly bung: string | null;
  };
  readonly prescriptionFormula: string | null;
  readonly prescriptionDosage: string | null;
  readonly labResults: string | null;
  readonly status: VisitStatus;
  readonly herbs: VisitHerbResponse[];
  readonly clinicalImages: VisitClinicalImageResponse[];
  readonly followUpPlan: FollowUpPlanResponse | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type VisitWithRelations = MedicalVisit & {
  herbs: VisitHerb[];
  clinicalImages: VisitClinicalImage[];
  followUpsOriginated: PatientFollowUp[];
};

export function mapFollowUpToResponse(
  followUp: PatientFollowUp,
): FollowUpPlanResponse {
  return {
    id: followUp.id,
    followUpDate: formatDateOnly(followUp.followUpDate),
    assessmentDate: formatDateOnly(followUp.assessmentDate),
    reminderDaysBefore: computeReminderDaysBefore(
      followUp.followUpDate,
      followUp.assessmentDate,
    ),
    physicianInCharge: followUp.physicianInCharge,
    facility: followUp.facility,
    scheduleStatus: followUp.scheduleStatus,
    assessmentResult: followUp.assessmentResult,
    assessmentNote: followUp.assessmentNote,
    assessedAt: followUp.assessedAt?.toISOString() ?? null,
  };
}

export function mapVisitToResponse(visit: VisitWithRelations): MedicalVisitResponse {
  const followUp = visit.followUpsOriginated[0] ?? null;

  return {
    id: visit.id,
    patientId: visit.patientId,
    visitNumber: visit.visitNumber,
    title: visit.title,
    visitDate: formatDateOnly(visit.visitDate),
    doctorName: visit.doctorName,
    mode: visit.mode,
    location: visit.location,
    bloodPressure: visit.bloodPressure,
    pulse: visit.pulse,
    symptoms: visit.symptoms,
    pulseDiagnosis: {
      ta: visit.pulseDiagnosisTa,
      huu: visit.pulseDiagnosisHuu,
      bung: visit.pulseDiagnosisBung,
    },
    prescriptionFormula: visit.prescriptionFormula,
    prescriptionDosage: visit.prescriptionDosage,
    labResults: visit.labResults,
    status: visit.status,
    herbs: visit.herbs.map((herb) => ({
      id: herb.id,
      name: herb.name,
      weight: herb.weight,
      sortOrder: herb.sortOrder,
    })),
    clinicalImages: visit.clinicalImages.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      category: image.category,
      sortOrder: image.sortOrder,
    })),
    followUpPlan: followUp ? mapFollowUpToResponse(followUp) : null,
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
  };
}
