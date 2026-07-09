import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogServiceStatus, PatientServiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import {
  PatientServiceResponse,
  mapPatientServiceToResponse,
} from './mappers/patient-service.mapper';
import { UpdatePatientServiceDto } from './dto/update-patient-service.dto';
import { PATIENT_SERVICE_BLOCKED_ACTION } from './patient-service-action.constants';
import {
  assertPatientServiceIsActive,
  cancelPatientServiceRecord,
} from './patient-service-cancel.util';

// recordInclude là một object chứa các thuộc tính của bảng patient_service_record
// select: { fullName: true } là một object chứa các thuộc tính của bảng staff
// finalizedBy là một object chứa các thuộc tính của bảng staff
// consultant là một object chứa các thuộc tính của bảng staff
const recordInclude = {
  consultant: { select: { fullName: true } },
  finalizedBy: { select: { fullName: true } },
  catalogService: { select: { groupId: true } },
  _count: { select: { paymentLines: true } },
} satisfies Prisma.PatientServiceRecordInclude;

@Injectable()
export class PatientServiceService {
  constructor(private readonly prisma: PrismaService) {}
  // Lấy danh sách dịch vụ của bệnh nhân
  async findAllByPatient(patientId: string): Promise<PatientServiceResponse[]> {
    await this.ensurePatientExists(patientId);

    const records = await this.prisma.patientServiceRecord.findMany({
      where: { patientId },
      include: recordInclude,
      orderBy: { finalizedAt: 'desc' },
    });

    return records.map(mapPatientServiceToResponse);
  }

  // Tạo dịch vụ cho bệnh nhân
  async create(
    patientId: string,
    dto: CreatePatientServiceDto,
    finalizedById: string,
  ): Promise<PatientServiceResponse> {
    // Kiểm tra xem bệnh nhân có tồn tại không
    await this.ensurePatientExists(patientId);

    // Kiểm tra xem dịch vụ có tồn tại và hoạt động không
    const catalog = await this.prisma.catalogService.findUnique({
      where: { id: dto.catalogServiceId },
    });
    if (!catalog || catalog.status !== CatalogServiceStatus.ACTIVE) {
      throw new BadRequestException('Dịch vụ không tồn tại hoặc không hoạt động');
    }

    // Kiểm tra xem người tư vấn có tồn tại và hoạt động không
    await this.ensureStaffExists(dto.consultantId, 'Người tư vấn');
    if (dto.telesaleId) {
      await this.ensureStaffExists(dto.telesaleId, 'Telesale');
    }
    // Kiểm tra xem người chốt dịch vụ có tồn tại và hoạt động không
    await this.ensureStaffExists(finalizedById, 'Người chốt dịch vụ');

    // Tính toán tổng tiền
    const subtotal = dto.unitPriceAfterVat * dto.quantity;
    // Tính toán tổng tiền sau khi giảm giá
    const finalAmount = Math.max(0, subtotal - dto.discount);
    // Tính toán tổng tiền trước khi giảm giá
    const listPrice = dto.discount > 0 ? subtotal : null;

    // Tạo dịch vụ cho bệnh nhân
    const created = await this.prisma.patientServiceRecord.create({
      data: {
        patientId,
        catalogServiceId: catalog.id,
        serviceCode: catalog.code,
        serviceName: catalog.name,
        consultantId: dto.consultantId,
        telesaleId: dto.telesaleId,
        finalizedById,
        unitPrice: dto.unitPrice,
        vatPercent: dto.vatPercent,
        vatAmount: dto.vatAmount,
        unitPriceAfterVat: dto.unitPriceAfterVat,
        quantity: dto.quantity,
        discount: dto.discount,
        finalAmount,
        listPrice,
        treatmentCount: dto.treatmentCount,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        note: dto.note?.trim() || null,
      },
      include: recordInclude,
    });

    return mapPatientServiceToResponse(created);
  }

  // Xóa dịch vụ của bệnh nhân
  async delete(patientId: string, serviceId: string): Promise<void> {
    await this.ensurePatientExists(patientId);

    const service = await this.prisma.patientServiceRecord.findFirst({
      where: { id: serviceId, patientId },
      select: {
        id: true,
        paidAmount: true,
        _count: { select: { paymentLines: true } },
      },
    });

    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }

    if (service._count.paymentLines > 0 || Number(service.paidAmount) > 0) {
      throw new BadRequestException(
        'Dịch vụ đã có phiếu thanh toán, không thể xóa. Vui lòng hoàn tiền và hủy dịch vụ.',
      );
    }

    await this.prisma.patientServiceRecord.delete({
      where: { id: serviceId },
    });
  }

  async cancel(
    patientId: string,
    serviceId: string,
    cancelledById: string,
  ): Promise<PatientServiceResponse> {
    await this.ensurePatientExists(patientId);

    const service = await this.prisma.patientServiceRecord.findFirst({
      where: { id: serviceId, patientId },
    });
    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }
    if (service.status === PatientServiceStatus.CANCELLED) {
      throw new BadRequestException('Dịch vụ đã được hủy');
    }

    return this.prisma.$transaction(async (tx) => {
      await cancelPatientServiceRecord(tx, serviceId, cancelledById);
      const updated = await tx.patientServiceRecord.findUniqueOrThrow({
        where: { id: serviceId },
        include: recordInclude,
      });
      return mapPatientServiceToResponse(updated);
    });
  }

  async update(
    patientId: string,
    serviceId: string,
    dto: UpdatePatientServiceDto,
  ): Promise<PatientServiceResponse> {
    await this.ensurePatientExists(patientId);

    const existing = await this.prisma.patientServiceRecord.findFirst({
      where: { id: serviceId, patientId },
    });
    if (!existing) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }
    assertPatientServiceIsActive(existing, PATIENT_SERVICE_BLOCKED_ACTION.UPDATE);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Không có dữ liệu cập nhật');
    }

    let catalogServiceId = existing.catalogServiceId;
    let serviceCode = existing.serviceCode;
    let serviceName = existing.serviceName;

    if (dto.catalogServiceId !== undefined) {
      const catalog = await this.prisma.catalogService.findUnique({
        where: { id: dto.catalogServiceId },
      });
      if (!catalog || catalog.status !== CatalogServiceStatus.ACTIVE) {
        throw new BadRequestException('Dịch vụ không tồn tại hoặc không hoạt động');
      }
      catalogServiceId = catalog.id;
      serviceCode = catalog.code;
      serviceName = catalog.name;
    }

    if (dto.consultantId !== undefined) {
      await this.ensureStaffExists(dto.consultantId, 'Người tư vấn');
    }
    if (dto.telesaleId !== undefined && dto.telesaleId) {
      await this.ensureStaffExists(dto.telesaleId, 'Telesale');
    }

    const unitPriceAfterVat = dto.unitPriceAfterVat ?? Number(existing.unitPriceAfterVat);
    const quantity = dto.quantity ?? existing.quantity;
    if (quantity < existing.completedSessions) {
      throw new BadRequestException('Số lượng không được nhỏ hơn số buổi đã sử dụng');
    }
    const discount = dto.discount ?? Number(existing.discount);
    const subtotal = unitPriceAfterVat * quantity;
    // finalAmount là tổng tiền sau khi giảm giá
    const finalAmount = Math.max(0, subtotal - discount);
    // listPrice là tổng tiền trước khi giảm giá
    const listPrice = discount > 0 ? subtotal : null;

    const updated = await this.prisma.patientServiceRecord.update({
      where: { id: serviceId },
      data: {
        ...(dto.catalogServiceId !== undefined && {
          catalogServiceId,
          serviceCode,
          serviceName,
        }),
        ...(dto.consultantId !== undefined && { consultantId: dto.consultantId }),
        ...(dto.telesaleId !== undefined && { telesaleId: dto.telesaleId || null }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
        ...(dto.vatPercent !== undefined && { vatPercent: dto.vatPercent }),
        ...(dto.vatAmount !== undefined && { vatAmount: dto.vatAmount }),
        ...(dto.unitPriceAfterVat !== undefined && { unitPriceAfterVat: dto.unitPriceAfterVat }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.discount !== undefined && { discount: dto.discount }),
        ...(dto.treatmentCount !== undefined && { treatmentCount: dto.treatmentCount }),
        ...(dto.expiryDate !== undefined && {
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        }),
        ...(dto.note !== undefined && { note: dto.note.trim() || null }),
        finalAmount,
        listPrice,
      },
      include: recordInclude,
    });

    return mapPatientServiceToResponse(updated);
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

  private async ensureStaffExists(staffId: string, label: string): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, isActive: true },
    });
    if (!staff || !staff.isActive) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
  }
}
