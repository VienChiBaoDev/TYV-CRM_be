import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
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

// dịch vụ thanh toán
@Injectable()
export class PatientPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  // tìm tất cả thanh toán của một bệnh nhân
  async findAllByPatient(patientId: string): Promise<PatientPaymentsListResponse> {
    await this.ensurePatientExists(patientId);

    const [payments, aggregate] = await Promise.all([
      this.prisma.patientPayment.findMany({
        where: { patientId },
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
      }),
      // aggregate tổng số tiền thanh toán của một bệnh nhân
      this.prisma.patientServiceRecord.aggregate({
        where: { patientId },
        _sum: { finalAmount: true, paidAmount: true },
      }),
    ]);
    // servicesTotal: tổng số tiền dịch vụ
    // paidTotal: tổng số tiền thanh toán
    const servicesTotal = Number(aggregate._sum.finalAmount ?? 0);
    const paidTotal = Number(aggregate._sum.paidAmount ?? 0);

    return {
      summary: mapPaymentSummary(servicesTotal, paidTotal),
      payments: payments.map(mapPatientPaymentToResponse),
    };
  }

  // tạo thanh toán mới
  async create(
    patientId: string,
    dto: CreatePatientPaymentDto,
    processedById: string,
  ): Promise<PatientPaymentResponse> {
    await this.ensurePatientExists(patientId);

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
      const payment = await tx.patientPayment.create({
        data: {
          patientId,
          voucherCode,
          paymentMethod,
          paymentDetail: dto.paymentDetail?.trim() || null,
          bankCode: dto.bankCode?.trim() || null,
          branch: dto.branch.trim(),
          content: dto.content?.trim() || null,
          totalAmount,
          processedById,
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
    processedById: string,
  ): Promise<PatientPaymentResponse> {
    await this.ensurePatientExists(patientId);

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

      const payment = await tx.patientPayment.create({
        data: {
          patientId,
          voucherCode,
          paymentMethod,
          paymentDetail: dto.paymentDetail?.trim() || null,
          bankCode: dto.bankCode?.trim() || null,
          branch: dto.branch.trim(),
          content: content || null,
          totalAmount: -totalAmount, // âm
          processedById,
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
          await cancelPatientServiceRecord(tx, item.patientServiceRecordId, processedById);
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

  private async ensurePatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Không tìm thấy bệnh nhân');
    }
  }
}
