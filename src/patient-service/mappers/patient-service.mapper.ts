import type { PatientServiceRecord, Prisma, Staff } from '@prisma/client';
import { formatDateOnly } from '../../medical-visit/mappers/visit.mapper';

type PatientServiceRecordWithRelations = PatientServiceRecord & {
  consultant: Pick<Staff, 'fullName'>;
  finalizedBy: Pick<Staff, 'fullName'>;
  catalogService: { groupId: string };
};

export interface PatientServicePersonResponse {
  readonly name: string;
  readonly initials: string;
}

export interface PatientServiceAmountResponse {
  readonly listPrice?: number;
  readonly otherDiscount?: {
    readonly amount: number;
    readonly percent: number;
  };
  readonly finalAmount: number;
}

export interface PatientServiceFormDataResponse {
  readonly consultantId: string;
  readonly telesaleId: string | null;
  readonly groupId: string;
  readonly catalogServiceId: string;
  readonly unitPrice: number;
  readonly vatPercent: number;
  readonly vatAmount: number;
  readonly unitPriceAfterVat: number;
  readonly quantity: number;
  readonly discount: number;
  readonly treatmentCount: number;
  readonly expiryDate: string | null;
}

export interface PatientServiceResponse {
  readonly id: string;
  readonly serviceCode: string;
  readonly serviceName: string;
  readonly progress: {
    readonly current: number;
    readonly total: number;
  };
  readonly amount: PatientServiceAmountResponse;
  readonly consultant: PatientServicePersonResponse;
  readonly note: string;
  readonly finalizedBy: PatientServicePersonResponse;
  readonly finalizedAt: string;
  readonly form: PatientServiceFormDataResponse;
}

function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}
// Tạo chữ cái đầu tiên của tên người dùng
function buildInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

// Định dạng ngày tháng năm giờ phút
function formatFinalizedAt(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}-${month}-${year}`;
}
// Map người dùng
function mapPerson(staff: Pick<Staff, 'fullName'>): PatientServicePersonResponse {
  return {
    name: staff.fullName,
    initials: buildInitials(staff.fullName),
  };
}

// Map dịch vụ cho bệnh nhân
function mapFormData(
  record: PatientServiceRecordWithRelations,
): PatientServiceFormDataResponse {
  return {
    consultantId: record.consultantId,
    telesaleId: record.telesaleId,
    groupId: record.catalogService.groupId,
    catalogServiceId: record.catalogServiceId,
    unitPrice: toNumber(record.unitPrice),
    vatPercent: toNumber(record.vatPercent),
    vatAmount: toNumber(record.vatAmount),
    unitPriceAfterVat: toNumber(record.unitPriceAfterVat),
    quantity: record.quantity,
    discount: toNumber(record.discount),
    treatmentCount: record.treatmentCount,
    expiryDate: record.expiryDate ? formatDateOnly(record.expiryDate) : null,
  };
}

export function mapPatientServiceToResponse(
  record: PatientServiceRecordWithRelations,
): PatientServiceResponse {
  const finalAmount = toNumber(record.finalAmount);
  const discount = toNumber(record.discount);
  const listPrice = record.listPrice != null ? toNumber(record.listPrice) : undefined;

  const amount: PatientServiceAmountResponse =
    discount > 0 && listPrice != null
      ? {
          listPrice,
          otherDiscount: {
            amount: discount,
            percent: listPrice > 0 ? Math.round((discount / listPrice) * 100) : 0,
          },
          finalAmount,
        }
      : { finalAmount };

  return {
    id: record.id,
    serviceCode: record.serviceCode,
    serviceName: record.serviceName,
    progress: {
      current: record.completedSessions,
      total: record.quantity,
    },
    amount,
    consultant: mapPerson(record.consultant),
    note: record.note ?? '',
    finalizedBy: mapPerson(record.finalizedBy),
    finalizedAt: formatFinalizedAt(record.finalizedAt),
    form: mapFormData(record),
  };
}
