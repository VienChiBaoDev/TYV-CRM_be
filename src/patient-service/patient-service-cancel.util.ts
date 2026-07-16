import { BadRequestException } from '@nestjs/common';
import { PatientServiceStatus, Prisma } from '@prisma/client';
import {
  type PatientServiceBlockedAction,
  PATIENT_SERVICE_BLOCKED_ACTION_LABEL,
} from './patient-service-action.constants';

export async function cancelPatientServiceRecord(
  tx: Prisma.TransactionClient,
  serviceId: string,
  cancelledById: string,
): Promise<void> {
  const service = await tx.patientServiceRecord.findUnique({
    where: { id: serviceId },
    select: { status: true, paidAmount: true },
  });
  if (!service || service.status === PatientServiceStatus.CANCELLED) {
    return;
  }

  // Chốt hợp đồng tại phần đã thu — tránh "Còn lại" ảo sau hủy/hoàn
  await tx.patientServiceRecord.update({
    where: { id: serviceId },
    data: {
      status: PatientServiceStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledById,
      finalAmount: service.paidAmount,
    },
  });
}

export function assertPatientServiceIsActive(
  service: { serviceName: string; status: PatientServiceStatus },
  action: PatientServiceBlockedAction,
): void {
  if (service.status === PatientServiceStatus.CANCELLED) {
    throw new BadRequestException(
      `Dịch vụ "${service.serviceName}" đã bị hủy, không thể ${PATIENT_SERVICE_BLOCKED_ACTION_LABEL[action]}.`,
    );
  }
}
