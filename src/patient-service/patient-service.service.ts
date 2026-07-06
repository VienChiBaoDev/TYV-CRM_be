import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogServiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import {
  PatientServiceResponse,
  mapPatientServiceToResponse,
} from './mappers/patient-service.mapper';

const recordInclude = {
  consultant: { select: { fullName: true } },
  finalizedBy: { select: { fullName: true } },
  // satisfies để đảm bảo rằng recordInclude là một Prisma.PatientServiceRecordInclude
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
