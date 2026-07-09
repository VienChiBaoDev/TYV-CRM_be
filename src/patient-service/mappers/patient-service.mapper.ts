import type { PatientServiceRecord, PatientServiceStatus, Staff } from '@prisma/client';
import {
  buildInitials,
  decimalToNumber,
  formatDisplayDatetime,
} from '../../common/mapper-utils';
import { formatDateOnly } from '../../medical-visit/mappers/visit.mapper';

type PatientServiceRecordWithRelations = PatientServiceRecord & {
  consultant: Pick<Staff, 'fullName'>;
  finalizedBy: Pick<Staff, 'fullName'>;
  catalogService: { groupId: string };
  _count?: { paymentLines: number };
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
  readonly paidAmount: number;
  readonly unpaidAmount: number;
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
  readonly status: PatientServiceStatus;
  readonly cancelledAt: string | null;
  readonly hasPaymentHistory: boolean;
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

function mapPerson(staff: Pick<Staff, 'fullName'>): PatientServicePersonResponse {
  return {
    name: staff.fullName,
    initials: buildInitials(staff.fullName),
  };
}

// Map dịch vụ cho bệnh nhân
function mapFormData(record: PatientServiceRecordWithRelations): PatientServiceFormDataResponse {
  return {
    consultantId: record.consultantId,
    telesaleId: record.telesaleId,
    groupId: record.catalogService.groupId,
    catalogServiceId: record.catalogServiceId,
    unitPrice: decimalToNumber(record.unitPrice),
    vatPercent: decimalToNumber(record.vatPercent),
    vatAmount: decimalToNumber(record.vatAmount),
    unitPriceAfterVat: decimalToNumber(record.unitPriceAfterVat),
    quantity: record.quantity,
    discount: decimalToNumber(record.discount),
    treatmentCount: record.treatmentCount,
    expiryDate: record.expiryDate ? formatDateOnly(record.expiryDate) : null,
  };
}

export function mapPatientServiceToResponse(
  record: PatientServiceRecordWithRelations,
): PatientServiceResponse {
  const finalAmount = decimalToNumber(record.finalAmount);
  const discount = decimalToNumber(record.discount);
  const listPrice =
    record.listPrice != null ? decimalToNumber(record.listPrice) : undefined;
  const paidAmount = decimalToNumber(record.paidAmount);
  const unpaidAmount = Math.max(0, finalAmount - paidAmount);

  const amount: PatientServiceAmountResponse =
    discount > 0 && listPrice != null
      ? {
          listPrice,
          otherDiscount: {
            amount: discount,
            percent: listPrice > 0 ? Math.round((discount / listPrice) * 100) : 0,
          },
          finalAmount,
          paidAmount,
          unpaidAmount,
        }
      : { finalAmount, paidAmount, unpaidAmount };

  return {
    id: record.id,
    status: record.status,
    cancelledAt: record.cancelledAt ? formatDisplayDatetime(record.cancelledAt) : null,
    hasPaymentHistory: (record._count?.paymentLines ?? 0) > 0,
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
    finalizedAt: formatDisplayDatetime(record.finalizedAt),
    form: mapFormData(record),
  };
}
