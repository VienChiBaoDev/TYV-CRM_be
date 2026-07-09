import { Prisma } from '@prisma/client';

// Tính số tiền đã thanh toán cho service
export function calcTreatedAmount(record: {
  finalAmount: Prisma.Decimal;
  completedSessions: number;
  quantity: number;
}): number {
  const finalAmount = Number(record.finalAmount);
  if (record.quantity <= 0) return 0;
  return Math.round((finalAmount * record.completedSessions) / record.quantity);
}

// Tính số tiền có thể hoàn trả cho service
export function getMaxRefundable(record: {
  paidAmount: Prisma.Decimal;
  finalAmount: Prisma.Decimal;
  completedSessions: number;
  quantity: number;
}): number {
  const paid = Number(record.paidAmount);
  return Math.max(0, paid - calcTreatedAmount(record));
}
