import { PaymentMethod, Prisma } from '@prisma/client';
import type { PaginatedMeta } from '../../common/interfaces/paginated-response.interface';
import { buildInitials, decimalToNumber, formatDisplayDate } from '../../common/mapper-utils';
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
  /** Tài khoản nhận tiền tại thời điểm thu — null nếu thu tiền mặt. */
  readonly bankAccount: PatientPaymentBankAccountResponse | null;
  readonly totalAmount: number;
  readonly details: PatientPaymentDetailResponse[];
}
export interface PatientPaymentBankAccountResponse {
  readonly id: string | null;
  readonly bankName: string;
  readonly accountHolder: string;
  readonly accountNumber: string;
  readonly label: string;
}

export interface PatientPaymentSummaryResponse {
  readonly total: number;
  readonly paid: number;
  readonly remaining: number;
  readonly deposit: number;
  readonly products: number;
  readonly services: number;
  readonly refund: number;
}
// hiển thị danh sách thanh toán của một dịch vụ
export interface PatientPaymentsListResponse {
  readonly summary: PatientPaymentSummaryResponse;
  readonly payments: PatientPaymentResponse[];
  readonly meta: PaginatedMeta;
}
// chuyển đổi phương thức thanh toán thành tên để hiển thị
export function formatPaymentMethodLabel(
  method: PaymentMethod,
  bankLabel?: string | null,
): string {
  if (method === PaymentMethod.CASH) return 'Tiền mặt';
  return bankLabel ? `Chuyển khoản - ${bankLabel}` : 'Chuyển khoản';
}

// gộp thông tin tài khoản nhận tiền từ các cột snapshot của phiếu thu
function mapBankAccount(
  payment: PaymentWithRelations,
): PatientPaymentBankAccountResponse | null {
  if (payment.paymentMethod !== PaymentMethod.BANK_TRANSFER) return null;
  if (!payment.bankNameSnapshot) return null;

  const bankName = payment.bankNameSnapshot;
  const accountHolder = payment.bankHolderSnapshot ?? '';
  const accountNumber = payment.bankNumberSnapshot ?? '';

  return {
    id: payment.bankAccountId,
    bankName,
    accountHolder,
    accountNumber,
    label: [bankName, accountHolder].filter(Boolean).join(' - '),
  };
}
// chuyển đổi dữ liệu thanh toán thành dữ liệu để hiển thị
export function mapPatientPaymentToResponse(payment: PaymentWithRelations): PatientPaymentResponse {
  const bankAccount = mapBankAccount(payment);

  return {
    id: payment.id,
    voucherCode: payment.voucherCode,
    voucherDate: formatDisplayDate(payment.createdAt),
    processedBy: {
      name: payment.processedBy.fullName,
      initials: buildInitials(payment.processedBy.fullName),
    },
    paymentMethod: formatPaymentMethodLabel(payment.paymentMethod, bankAccount?.label),
    bankAccount,
    totalAmount: decimalToNumber(payment.totalAmount),
    details: payment.lines.map((line) => ({
      amount: decimalToNumber(line.amount),
      serviceCode: line.serviceCode,
      serviceName: line.serviceName,
    })),
  };
}

// chuyển đổi dữ liệu thanh toán thành dữ liệu để hiển thị
export function mapPaymentSummary(
  servicesTotal: number,
  paidTotal: number,
  refundTotal: number,
): PatientPaymentSummaryResponse {
  return {
    total: servicesTotal,
    paid: paidTotal,
    remaining: servicesTotal - paidTotal,
    deposit: 0,
    products: 0,
    services: servicesTotal,
    refund: refundTotal,
  };
}
