import { Prisma } from '@prisma/client';

export interface PatientServiceSessionSource {
  treatmentCount: number; // Số buổi điều trị chuẩn production
  quantity: number; // Số buổi điều trị thực tế
  finalAmount: Prisma.Decimal | number; // Số tiền đã thanh toán theo hợp đồng
  paidAmount: Prisma.Decimal | number; // Số tiền đã thanh toán thực tế
  completedSessions: number; // Số buổi điều trị đã thực hiện
}

/** Tổng buổi điều trị chuẩn production */
export function getSessionTotal(record: { treatmentCount: number; quantity: number }): number {
  return record.treatmentCount > 0 ? record.treatmentCount : record.quantity;
}

/** Số buổi tối đa được phép làm theo tiền đã thu */
export function getMaxAllowedSession(record: PatientServiceSessionSource): number {
  const sessionTotal = getSessionTotal(record);
  if (sessionTotal <= 0) return 0;

  const finalAmount = Number(record.finalAmount);
  const paidAmount = Number(record.paidAmount);
  if (finalAmount <= 0 || paidAmount <= 0) return 0;

  const entitled = Math.floor((paidAmount / finalAmount) * sessionTotal);
  return Math.min(sessionTotal, Math.max(0, entitled));
}

/** Tiền đã "tiêu thụ" theo buổi — dùng cho hoàn tiền */
export function calcTreatedAmount(record: PatientServiceSessionSource): number {
  const sessionTotal = getSessionTotal(record);
  const finalAmount = Number(record.finalAmount);
  if (sessionTotal <= 0 || finalAmount <= 0) return 0;
  return Math.round((finalAmount * record.completedSessions) / sessionTotal);
}
/** Số tiền tối đa được hoàn theo buổi */
export function getMaxRefundable(record: PatientServiceSessionSource): number {
  const paid = Number(record.paidAmount);
  return Math.max(0, paid - calcTreatedAmount(record));
}
/** Kiểm tra xem buổi điều trị đã hoàn thành hay chưa */
export function isSessionCompleted(content: string | null | undefined): boolean {
  return Boolean(content?.trim());
}

/** Recalc completedSessions từ danh sách buổi đã lưu */
export function calcCompletedSessions(
  sessions: readonly { sessionNumber: number; treatmentContent: string }[],
): number {
  return sessions
    .filter((s) => isSessionCompleted(s.treatmentContent))
    .reduce((max, s) => Math.max(max, s.sessionNumber), 0);
}
