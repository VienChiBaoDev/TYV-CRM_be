import { PaymentMethod, Prisma } from '@prisma/client';
// type PaymentWithRelations là để tạo type cho dữ liệu của bảng patient_payment
// processedBy là để include dữ liệu từ bảng staff
// lines là để include dữ liệu từ bảng patient_payment_line
// PatientPaymentGetPayload là để lấy dữ liệu từ bảng patient_payment
type PaymentWithRelations = Prisma.PatientPaymentGetPayload<{
  include: {
    processedBy: { select: { fullName: true } };
    lines: true;
  };
}>;
export interface PatientPaymentDetailResponse {
  readonly amount: number;
  readonly serviceCode: string;
  readonly serviceName: string;
}
// hiển thị chi tiết thanh toán của một dịch vụ
export interface PatientPaymentResponse {
  readonly id: string;
  readonly voucherCode: string;
  readonly voucherDate: string;
  readonly processedBy: { readonly initials: string; readonly name: string };
  readonly paymentMethod: string;
  readonly totalAmount: number;
  readonly details: PatientPaymentDetailResponse[];
}
export interface PatientPaymentSummaryResponse {
  readonly total: number;
  readonly paid: number;
  readonly remaining: number;
  readonly deposit: number;
  readonly products: number;
  readonly services: number;
}
// hiển thị danh sách thanh toán của một dịch vụ
export interface PatientPaymentsListResponse {
  readonly summary: PatientPaymentSummaryResponse;
  readonly payments: PatientPaymentResponse[];
}
// chuyển đổi số thành số
function toNumber(value: Prisma.Decimal): number {
  return Number(value);
}
// chuyển đổi tên thành chữ cái đầu tiên
function buildInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}
// chuyển đổi ngày thành ngày tháng năm
function formatVoucherDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}
// chuyển đổi phương thức thanh toán thành tên
const PAYMENT_DETAIL_LABELS: Record<string, string> = {
  mb: 'MB Bank - Đặng Hữu Phúc',
  vcb: 'Vietcombank',
  tcb: 'Techcombank',
  acb: 'ACB',
};
// chuyển đổi phương thức thanh toán thành tên để hiển thị
export function formatPaymentMethodLabel(
  method: PaymentMethod,
  paymentDetail?: string | null,
): string {
  if (method === PaymentMethod.CASH) return 'Tiền mặt';
  const detailLabel = paymentDetail
    ? (PAYMENT_DETAIL_LABELS[paymentDetail] ?? paymentDetail)
    : 'Chuyển khoản';
  return `Chuyển Khoản - ${detailLabel}`;
}
// chuyển đổi dữ liệu thanh toán thành dữ liệu để hiển thị
export function mapPatientPaymentToResponse(payment: PaymentWithRelations): PatientPaymentResponse {
  return {
    id: payment.id,
    voucherCode: payment.voucherCode,
    voucherDate: formatVoucherDate(payment.createdAt),
    processedBy: {
      name: payment.processedBy.fullName,
      initials: buildInitials(payment.processedBy.fullName),
    },
    paymentMethod: formatPaymentMethodLabel(payment.paymentMethod, payment.paymentDetail),
    totalAmount: toNumber(payment.totalAmount),
    details: payment.lines.map((line) => ({
      amount: toNumber(line.amount),
      serviceCode: line.serviceCode,
      serviceName: line.serviceName,
    })),
  };
}

// chuyển đổi dữ liệu thanh toán thành dữ liệu để hiển thị
export function mapPaymentSummary(
  servicesTotal: number,
  paidTotal: number,
): PatientPaymentSummaryResponse {
  return {
    total: servicesTotal,
    paid: paidTotal,
    remaining: servicesTotal - paidTotal,
    deposit: 0,
    products: 0,
    services: servicesTotal,
  };
}
