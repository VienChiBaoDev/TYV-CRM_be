import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import type { JwtPayloadUser } from '../auth/types';
import { assertPatientAccess } from '../auth/access/patient-access';
import { PrismaService } from '../prisma/prisma.service';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import { CreatePatientPaymentDto, PATIENT_PAYMENT_METHOD } from './dto/create-patient-payment.dto';
import {
  mapPatientPaymentToResponse,
  mapPaymentSummary,
  PatientPaymentResponse,
  PatientPaymentsListResponse,
} from './mappers/patient-payment.mapper';
import { getMaxRefundable } from './patient-refund.rules';
import { CreatePatientRefundDto, REFUND_REASON } from './dto/create-patient-refund.dto';
import { QueryPatientPaymentsDto } from './dto/query-patient-payments.dto';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../common/dto/pagination-query.dto';
import { buildPaginatedMeta } from '../common/pagination/paginate';
import { PATIENT_SERVICE_BLOCKED_ACTION } from '../patient-service/patient-service-action.constants';
import {
  assertPatientServiceIsActive,
  cancelPatientServiceRecord,
} from '../patient-service/patient-service-cancel.util';

// chọn dữ liệu thanh toán để hiển thị
const paymentInclude = {
  processedBy: { select: { fullName: true } },
  lines: true,
} satisfies Prisma.PatientPaymentInclude;

/** Ba cột snapshot ghi kèm phiếu thu để lịch sử không đổi khi tài khoản bị sửa. */
type BankAccountSnapshot = Pick<
  Prisma.PatientPaymentUncheckedCreateInput,
  'bankAccountId' | 'bankNameSnapshot' | 'bankHolderSnapshot' | 'bankNumberSnapshot'
>;

// dịch vụ thanh toán
@Injectable()
export class PatientPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // tìm tất cả thanh toán của một bệnh nhân
  async findAllByPatient(
    patientId: string,
    query: QueryPatientPaymentsDto = {},
    user: JwtPayloadUser,
  ): Promise<PatientPaymentsListResponse> {
    await assertPatientAccess(this.prisma, user, patientId);

    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const [payments, total, aggregate, refundAggregate] = await Promise.all([
      this.prisma.patientPayment.findMany({
        where: { patientId },
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.patientPayment.count({ where: { patientId } }),
      /// aggregate để tính tổng số tiền thanh toán và hoàn trả của một bệnh nhân
      // Tổng số tiền dịch vụ của một bệnh nhân bao gồm cả dịch vụ đã thanh toán và chưa thanh toán
      // finalAmount: số tiền dịch vụ
      // paidAmount: số tiền đã thanh toán
      this.prisma.patientServiceRecord.aggregate({
        where: { patientId },
        _sum: { finalAmount: true, paidAmount: true },
      }),
      // aggregate tổng số tiền hoàn trả của một bệnh nhân
      this.prisma.patientPayment.aggregate({
        where: {
          patientId,
          totalAmount: { lt: 0 }, // phiếu hoàn trả luôn âm
        },
        _sum: { totalAmount: true },
      }),
    ]);
    // servicesTotal: tổng số tiền dịch vụ
    // paidTotal: tổng số tiền thanh toán
    const servicesTotal = Number(aggregate._sum.finalAmount ?? 0);
    const paidTotal = Number(aggregate._sum.paidAmount ?? 0);
    const refundTotal = Math.abs(Number(refundAggregate._sum.totalAmount ?? 0));

    return {
      summary: mapPaymentSummary(servicesTotal, paidTotal, refundTotal),
      payments: payments.map(mapPatientPaymentToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  // tạo thanh toán mới
  async create(
    patientId: string,
    dto: CreatePatientPaymentDto,
    user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    await assertPatientAccess(this.prisma, user, patientId, 'edit');

    return this.prisma.$transaction(async (tx) => {
      // serviceIds: danh sách id dịch vụ thanh toán
      const serviceIds = dto.items.map((item) => item.patientServiceRecordId);
      // services: danh sách dịch vụ thanh toán
      const services = await tx.patientServiceRecord.findMany({
        where: { patientId, id: { in: serviceIds } },
      });

      if (services.length !== serviceIds.length) {
        throw new BadRequestException('Một hoặc nhiều dịch vụ không tồn tại');
      }
      // serviceMap: map dịch vụ thanh toán
      const serviceMap = new Map(services.map((service) => [service.id, service]));
      // kiểm tra số tiền thanh toán có hợp lệ không
      for (const item of dto.items) {
        const service = serviceMap.get(item.patientServiceRecordId)!;
        assertPatientServiceIsActive(service, PATIENT_SERVICE_BLOCKED_ACTION.COLLECT_PAYMENT);
        // unpaid: số tiền chưa thanh toán
        const unpaid = Number(service.finalAmount) - Number(service.paidAmount);
        if (item.amount <= 0 || item.amount > unpaid) {
          throw new BadRequestException(
            `Số tiền thu không hợp lệ cho dịch vụ ${service.serviceName}`,
          );
        }
      }
      // tính tổng số tiền thanh toán
      const totalAmount = dto.items.reduce((sum, item) => sum + item.amount, 0);
      // voucherCode: mã voucher
      const voucherCode = await this.generateVoucherCode(tx);
      // paymentMethod: phương thức thanh toán
      const paymentMethod =
        dto.paymentMethod === PATIENT_PAYMENT_METHOD.CASH
          ? PaymentMethod.CASH
          : PaymentMethod.BANK_TRANSFER;

      // tạo thanh toán mới
      const bankSnapshot = await this.resolveBankAccountSnapshot(
        tx,
        paymentMethod,
        dto.bankAccountId,
      );

      const payment = await tx.patientPayment.create({
        data: {
          patientId,
          voucherCode,
          paymentMethod,
          paymentDetail: dto.paymentDetail?.trim() || null,
          bankCode: dto.bankCode?.trim() || null,
          ...bankSnapshot,
          branch: dto.branch.trim(),
          content: dto.content?.trim() || null,
          totalAmount,
          processedById: user.id,
          ...(dto.createdAt ? { createdAt: new Date(dto.createdAt) } : {}),
          lines: {
            create: dto.items.map((item) => {
              const service = serviceMap.get(item.patientServiceRecordId)!;
              return {
                patientServiceRecordId: item.patientServiceRecordId,
                amount: item.amount,
                serviceCode: service.serviceCode,
                serviceName: service.serviceName,
              };
            }),
          },
        },
        include: paymentInclude,
      });

      // cập nhật số tiền thanh toán của dịch vụ
      for (const item of dto.items) {
        await tx.patientServiceRecord.update({
          where: { id: item.patientServiceRecordId },
          data: { paidAmount: { increment: item.amount } },
        });
      }
      // chuyển đổi dữ liệu thanh toán thành dữ liệu để hiển thị
      return mapPatientPaymentToResponse(payment);
    }, PRISMA_TRANSACTION_OPTIONS);
  }

  async createRefund(
    patientId: string,
    dto: CreatePatientRefundDto,
    user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    await assertPatientAccess(this.prisma, user, patientId, 'edit');

    return this.prisma.$transaction(async (tx) => {
      const serviceIds = dto.items.map((i) => i.patientServiceRecordId);
      // kết quả trả ra: serviceIds = [serviceId1, serviceId2, serviceId3]
      const services = await tx.patientServiceRecord.findMany({
        where: { patientId, id: { in: serviceIds } },
      });
      if (services.length !== serviceIds.length) {
        throw new BadRequestException('Một hoặc nhiều dịch vụ không tồn tại');
      }

      const serviceMap = new Map(services.map((s) => [s.id, s]));
      // Kết quả trả ra: serviceMap = { serviceId1: service1, serviceId2: service2, serviceId3: service3 }

      for (const item of dto.items) {
        const service = serviceMap.get(item.patientServiceRecordId)!;
        assertPatientServiceIsActive(service, PATIENT_SERVICE_BLOCKED_ACTION.REFUND);
        const maxRefund = getMaxRefundable(service);
        if (item.amount <= 0 || item.amount > maxRefund) {
          throw new BadRequestException(
            `Số tiền hoàn không hợp lệ cho dịch vụ ${service.serviceName}`,
          );
        }
      }

      const totalAmount = dto.items.reduce((sum, i) => sum + i.amount, 0);
      const voucherCode = await this.generateRefundVoucherCode(tx);
      const paymentMethod =
        dto.paymentMethod === PATIENT_PAYMENT_METHOD.CASH
          ? PaymentMethod.CASH
          : PaymentMethod.BANK_TRANSFER;

      const reasonLabel = REFUND_REASON[dto.reason as keyof typeof REFUND_REASON] ?? dto.reason;
      const content = [reasonLabel, dto.content?.trim()].filter(Boolean).join(' — ');

      const bankSnapshot = await this.resolveBankAccountSnapshot(
        tx,
        paymentMethod,
        dto.bankAccountId,
      );

      const payment = await tx.patientPayment.create({
        data: {
          patientId,
          voucherCode,
          paymentMethod,
          paymentDetail: dto.paymentDetail?.trim() || null,
          bankCode: dto.bankCode?.trim() || null,
          ...bankSnapshot,
          branch: dto.branch.trim(),
          content: content || null,
          totalAmount: -totalAmount, // âm
          processedById: user.id,
          ...(dto.createdAt ? { createdAt: new Date(dto.createdAt) } : {}),
          lines: {
            create: dto.items.map((item) => {
              const service = serviceMap.get(item.patientServiceRecordId)!;
              return {
                patientServiceRecordId: item.patientServiceRecordId,
                amount: -item.amount, // âm
                serviceCode: service.serviceCode,
                serviceName: service.serviceName,
              };
            }),
          },
        },
        include: paymentInclude,
      });

      for (const item of dto.items) {
        await tx.patientServiceRecord.update({
          where: { id: item.patientServiceRecordId },
          data: { paidAmount: { decrement: item.amount } },
        });
        if (item.lockService) {
          await cancelPatientServiceRecord(tx, item.patientServiceRecordId, user.id);
        }
      }

      return mapPatientPaymentToResponse(payment);
    }, PRISMA_TRANSACTION_OPTIONS);
  }

  private async generateRefundVoucherCode(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const prefix = `HTTYV${datePart}`;
    const count = await tx.patientPayment.count({ where: { voucherCode: { startsWith: prefix } } });
    return `${prefix}.${count + 1}`;
  }

  // tạo mã voucher
  private async generateVoucherCode(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    const prefix = `PTSTYV${datePart}`;
    const count = await tx.patientPayment.count({
      where: { voucherCode: { startsWith: prefix } },
    });
    return `${prefix}.${count + 1}`;
  }

  /**
   * Tra tài khoản ngân hàng nhận tiền và chụp lại thông tin tại thời điểm thu.
   * Thu bằng tiền mặt thì bỏ qua; chuyển khoản mà không chọn tài khoản vẫn cho lưu
   * để không chặn các phiếu nhập tay theo lối cũ.
   */
  private async resolveBankAccountSnapshot(
    tx: Prisma.TransactionClient,
    paymentMethod: PaymentMethod,
    bankAccountId?: string,
  ): Promise<BankAccountSnapshot> {
    if (paymentMethod !== PaymentMethod.BANK_TRANSFER || !bankAccountId) {
      return {
        bankAccountId: null,
        bankNameSnapshot: null,
        bankHolderSnapshot: null,
        bankNumberSnapshot: null,
      };
    }

    const account = await tx.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: {
        id: true,
        bankName: true,
        accountHolder: true,
        accountNumber: true,
        isActive: true,
      },
    });

    if (!account) {
      throw new BadRequestException('Không tìm thấy tài khoản ngân hàng');
    }
    if (!account.isActive) {
      throw new BadRequestException('Tài khoản ngân hàng này đã ngừng sử dụng');
    }

    return {
      bankAccountId: account.id,
      bankNameSnapshot: account.bankName,
      bankHolderSnapshot: account.accountHolder,
      bankNumberSnapshot: account.accountNumber,
    };
  }
}
