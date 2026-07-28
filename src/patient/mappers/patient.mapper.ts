import {
  ClinicBranch,
  CustomerStatus,
  Gender,
  MedicalVisit,
  Patient,
  PatientFollowUp,
  VisitClinicalImage,
  VisitHerb,
} from '@prisma/client';
import {
  formatDateOnly,
  mapVisitToResponse,
  MedicalVisitResponse,
} from '../../medical-visit/mappers/visit.mapper';

export interface PatientDetailResponse {
  readonly id: string;
  readonly patientCode: string;
  readonly fullName: string;
  readonly gender: Gender;
  readonly birthDate: string | null;
  readonly age: number | null;
  readonly occupation: string | null;
  readonly phone: string;
  readonly address: string | null;
  readonly avatarInitials: string | null;
  readonly clinicBranch: ClinicBranch;
  readonly tags: string[];
  readonly dietRestrictions: string[];
  readonly nextFollowUpDate: string | null;
  readonly customerStatus: CustomerStatus;
  readonly visitsCount: number;
  readonly treatmentDays: number;
  readonly assignedDoctors: AssignedStaffResponse[];
  readonly assignedAssistants: AssignedStaffResponse[];
  readonly visits: MedicalVisitResponse[];
}

export interface AssignedStaffResponse {
  readonly id: string;
  readonly fullName: string;
}

type VisitWithRelations = MedicalVisit & {
  herbs: VisitHerb[];
  clinicalImages: VisitClinicalImage[];
  followUpsOriginated: PatientFollowUp[];
};

type PatientWithVisits = Patient & {
  visits: VisitWithRelations[];
  assignedDoctors: AssignedStaffResponse[];
  assignedAssistants: AssignedStaffResponse[];
};

function computeAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function computeTreatmentDays(visits: VisitWithRelations[]): number {
  if (visits.length === 0) return 0;
  if (visits.length === 1) return 1;

  const dates = visits.map((visit) => visit.visitDate.getTime());
  const earliest = Math.min(...dates);
  const latest = Math.max(...dates);
  const diffMs = latest - earliest;

  return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export function mapPatientToDetailResponse(
  patient: PatientWithVisits,
): PatientDetailResponse {
  const visitsAsc = [...patient.visits].sort(
    (a, b) => a.visitNumber - b.visitNumber,
  );

  return {
    id: patient.id,
    patientCode: patient.patientCode,
    fullName: patient.fullName,
    gender: patient.gender,
    birthDate: patient.birthDate ? formatDateOnly(patient.birthDate) : null,
    age: computeAge(patient.birthDate),
    occupation: patient.occupation,
    phone: patient.phone,
    address: patient.address,
    avatarInitials: patient.avatarInitials,
    clinicBranch: patient.clinicBranch,
    tags: patient.tags,
    dietRestrictions: patient.dietRestrictions,
    nextFollowUpDate: patient.nextFollowUpDate
      ? formatDateOnly(patient.nextFollowUpDate)
      : null,
    customerStatus: patient.customerStatus,
    visitsCount: patient.visits.length,
    treatmentDays: computeTreatmentDays(patient.visits),
    assignedDoctors: patient.assignedDoctors.map((s) => ({
      id: s.id,
      fullName: s.fullName,
    })),
    assignedAssistants: patient.assignedAssistants.map((s) => ({
      id: s.id,
      fullName: s.fullName,
    })),
    visits: visitsAsc.map(mapVisitToResponse),
  };
}
