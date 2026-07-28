import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PatientServiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransactionService } from '../prisma/prisma-transaction.service';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { UpsertTreatmentSessionDto } from './dto/upsert-treatment-session.dto';
import {
  calcCompletedSessions,
  getMaxAllowedSession,
  getSessionTotal,
} from '../patient-service/patient-service-session.rules';
import {
  mapTreatmentSessionToResponse,
  TreatmentHistoryItemResponse,
  TreatmentSessionImageResponse,
  TreatmentSessionListResponse,
  TreatmentSessionResponse,
} from './mappers/treatment-session.mapper';
import { randomUUID } from 'node:crypto';
import { TreatmentSessionConsumableLineDto } from './dto/treatment-session-consumable.dto';

const MAX_TREATMENT_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
/**
 * Include cho session
 * Để lấy thông tin doctor, ptKtv, performedBy khi lấy danh sách điều trị chi tiết
 */
const sessionInclude = {
  doctor: { select: { fullName: true } },
  ptKtv: { select: { fullName: true } },
  performedBy: { select: { fullName: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  consumables: { orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.PatientTreatmentSessionInclude;

@Injectable()
export class PatientTreatmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTx: PrismaTransactionService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  /**
   * Find all sessions by service
   */
  async findByService(patientId: string, serviceId: string): Promise<TreatmentSessionListResponse> {
    // Lấy dịch vụ đã thanh toán và hoạt động
    const service = await this.getActivePaidServiceOrThrow(patientId, serviceId);
    // Tính tổng số buổi điều trị
    const sessionTotal = getSessionTotal(service);

    // Lấy danh sách điều trị chi tiết
    const sessions = await this.prisma.patientTreatmentSession.findMany({
      where: { patientServiceRecordId: serviceId },
      include: sessionInclude,
      orderBy: { sessionNumber: 'asc' },
    });

    return {
      service: {
        id: service.id,
        serviceName: service.serviceName,
        sessionTotal,
        completedSessions: service.completedSessions,
        maxAllowedSession: getMaxAllowedSession(service),
      },
      sessions: sessions.map(mapTreatmentSessionToResponse),
    };
  }
  /**
   * Find all sessions by patient
   */
  async findAllByPatient(patientId: string): Promise<TreatmentHistoryItemResponse[]> {
    // Chạy song song — ensurePatientExists vẫn throw 404 khi cần, không tốn round-trip nối tiếp
    const [, sessions] = await Promise.all([
      this.ensurePatientExists(patientId),
      // Lấy danh sách điều trị chi tiết
      this.prisma.patientTreatmentSession.findMany({
        where: {
          patientServiceRecord: { patientId },
        },
        include: {
          doctor: { select: { fullName: true } },
          ptKtv: { select: { fullName: true } },
          patientServiceRecord: {
            select: {
              id: true,
              serviceName: true,
              completedSessions: true,
              treatmentCount: true,
              quantity: true,
            },
          },
        },
        orderBy: [{ performedAt: 'desc' }],
      }),
    ]);

    return sessions.map((session) => {
      const sessionTotal = getSessionTotal(session.patientServiceRecord);
      const isCompleted = session.patientServiceRecord.completedSessions >= sessionTotal;

      return {
        id: session.id,
        serviceId: session.patientServiceRecord.id,
        serviceName: session.patientServiceRecord.serviceName,
        sessionNumber: session.sessionNumber,
        sessionTotal,
        treatmentContent: session.treatmentContent,
        performedAt: session.performedAt.toISOString(),
        doctorName: session.doctor?.fullName ?? null,
        ptKtvName: session.ptKtv?.fullName ?? null,
        status: isCompleted ? 'COMPLETED' : 'IN_PROGRESS',
      };
    });
  }

  /**
   * Upsert session
   */
  async upsertSession(
    patientId: string,
    serviceId: string,
    dto: UpsertTreatmentSessionDto,
    performedById: string,
  ): Promise<TreatmentSessionResponse> {
    /**
     * Lấy dịch vụ đã thanh toán và hoạt động
     */
    const service = await this.getActivePaidServiceOrThrow(patientId, serviceId);
    this.validateSessionNumber(service, dto.sessionNumber);

    if (dto.doctorId) await this.ensureStaffExists(dto.doctorId, 'Bác sĩ');
    if (dto.ptKtvId) await this.ensureStaffExists(dto.ptKtvId, 'PT/KTV');

    const now = new Date();

    return this.prismaTx.$transaction(async (tx) => {
      const existing = await tx.patientTreatmentSession.findUnique({
        where: {
          patientServiceRecordId_sessionNumber: {
            patientServiceRecordId: serviceId,
            sessionNumber: dto.sessionNumber,
          },
        },
        include: { consumables: true },
      });

      if (existing?.consumables.length && dto.consumables?.length) {
        throw new BadRequestException('Buổi điều trị đã ghi vật tư, không thể thay đổi');
      }

      // Nếu đã tồn tại thì update, nếu không thì create
      const saved = existing
        ? await tx.patientTreatmentSession.update({
            where: { id: existing.id },
            data: {
              doctorId: dto.doctorId ?? null,
              ptKtvId: dto.ptKtvId ?? null,
              professionalSupport: dto.professionalSupport?.trim() || null,
              treatmentContent: dto.treatmentContent.trim(),
              note: dto.note?.trim() || null,
              nextContent: dto.nextContent?.trim() || null,
              nextTreatmentDate: dto.nextTreatmentDate ? new Date(dto.nextTreatmentDate) : null,
            },
            include: sessionInclude,
          })
        : await tx.patientTreatmentSession.create({
            data: {
              patientServiceRecordId: serviceId,
              sessionNumber: dto.sessionNumber,
              doctorId: dto.doctorId ?? null,
              ptKtvId: dto.ptKtvId ?? null,
              professionalSupport: dto.professionalSupport?.trim() || null,
              treatmentContent: dto.treatmentContent.trim(),
              note: dto.note?.trim() || null,
              nextContent: dto.nextContent?.trim() || null,
              nextTreatmentDate: dto.nextTreatmentDate ? new Date(dto.nextTreatmentDate) : null,
              performedAt: now,
              performedById,
            },
            include: sessionInclude,
          });

      /**
       * Áp dụng vật tư tiêu hao lần đầu tiên
       */
      if (!existing?.consumables.length && dto.consumables?.length) {
        /**
         * Áp dụng vật tư tiêu hao lần đầu tiên
         */
        await this.applyConsumablesOnFirstSave(tx, saved.id, dto.consumables);
      }

      const allSessions = await tx.patientTreatmentSession.findMany({
        where: { patientServiceRecordId: serviceId },
        // Lấy sessionNumber và treatmentContent
        select: { sessionNumber: true, treatmentContent: true },
      });
      // Tính tổng số buổi điều trị đã hoàn thành
      const completedSessions = calcCompletedSessions(allSessions);

      // Cập nhật số buổi điều trị đã hoàn thành
      await tx.patientServiceRecord.update({
        where: { id: serviceId },
        data: { completedSessions },
      });

      if (!existing?.consumables.length && dto.consumables?.length) {
        /**
         * Lấy lại session sau khi áp dụng vật tư tiêu hao
         */
        const reloaded = await tx.patientTreatmentSession.findUniqueOrThrow({
          where: { id: saved.id },
          include: sessionInclude,
        });
        /**
         * Map session to response
         */
        return mapTreatmentSessionToResponse(reloaded);
      }

      return mapTreatmentSessionToResponse(saved);
    }, PRISMA_TRANSACTION_OPTIONS);
  }

  /**
   * Tải ảnh lên buổi điều trị
   */
  async uploadSessionImage(
    patientId: string,
    serviceId: string,
    sessionNumber: number,
    file: Express.Multer.File,
    performedById: string,
  ): Promise<TreatmentSessionImageResponse> {
    const service = await this.getActivePaidServiceOrThrow(patientId, serviceId);
    this.validateSessionNumber(service, sessionNumber);
    const session = await this.ensureSessionForImageUpload(serviceId, sessionNumber, performedById);
    this.assertValidImageFile(file);
    const extension = MIME_EXTENSION[file.mimetype] ?? 'jpg';
    const storagePath = `patients/${patientId}/treatment/${serviceId}/session-${sessionNumber}/${randomUUID()}.${extension}`;
    const uploaded = await this.supabaseStorage.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );
    const sortOrder = await this.getNextSessionImageSortOrder(session.id);
    const image = await this.prisma.patientTreatmentSessionImage.create({
      data: {
        patientTreatmentSessionId: session.id,
        imageUrl: uploaded.publicUrl,
        storagePath: uploaded.storagePath,
        sortOrder,
      },
    });
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      sortOrder: image.sortOrder,
    };
  }

  /**
   * Xóa ảnh buổi điều trị
   */
  async deleteSessionImage(
    patientId: string,
    serviceId: string,
    sessionNumber: number,
    imageId: string,
  ): Promise<void> {
    const service = await this.getActivePaidServiceOrThrow(patientId, serviceId);
    this.validateSessionNumber(service, sessionNumber);
    const session = await this.prisma.patientTreatmentSession.findUnique({
      where: {
        patientServiceRecordId_sessionNumber: {
          patientServiceRecordId: serviceId,
          sessionNumber,
        },
      },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Buổi điều trị không tồn tại');
    }
    const image = await this.prisma.patientTreatmentSessionImage.findFirst({
      where: {
        id: imageId,
        patientTreatmentSessionId: session.id,
      },
    });
    if (!image) {
      throw new NotFoundException('Ảnh không tồn tại');
    }
    if (image.storagePath) {
      await this.supabaseStorage.removeObject(image.storagePath);
    }
    await this.prisma.patientTreatmentSessionImage.delete({
      where: { id: imageId },
    });
  }

  /**
   * Lấy dịch vụ đã thanh toán và hoạt động
   */
  private async getActivePaidServiceOrThrow(patientId: string, serviceId: string) {
    const service = await this.prisma.patientServiceRecord.findFirst({
      where: { id: serviceId, patientId },
    });
    if (!service) {
      throw new NotFoundException('Dịch vụ không tồn tại');
    }
    if (service.status !== PatientServiceStatus.ACTIVE) {
      throw new BadRequestException('Dịch vụ đã bị hủy, không thể điều trị');
    }
    if (Number(service.paidAmount) <= 0) {
      throw new BadRequestException('Dịch vụ chưa thanh toán, không thể điều trị');
    }

    return service;
  }

  /**
   * Validate session number
   */
  private validateSessionNumber(
    service: {
      treatmentCount: number;
      quantity: number;
      finalAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      completedSessions: number;
    },
    sessionNumber: number,
  ) {
    // Tính tổng số buổi điều trị
    const sessionTotal = getSessionTotal(service);
    // Tính số buổi điều trị tối đa
    const maxAllowed = getMaxAllowedSession(service);

    if (sessionNumber < 1 || sessionNumber > sessionTotal) {
      throw new BadRequestException(`Buổi điều trị phải từ 1 đến ${sessionTotal}`);
    }
    if (sessionNumber > maxAllowed) {
      throw new BadRequestException('Chưa thanh toán đủ để mở buổi điều trị này');
    }
  }

  /**
   * Ensure patient exists
   */
  private async ensurePatientExists(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Không tìm thấy bệnh nhân');
  }

  /**
   * Ensure staff exists
   */
  private async ensureStaffExists(staffId: string, label: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, isActive: true },
    });
    if (!staff?.isActive) {
      throw new BadRequestException(`${label} không hợp lệ`);
    }
  }

  private assertValidImageFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Vui lòng chọn file ảnh');
    }

    if (file.size > MAX_TREATMENT_IMAGE_BYTES) {
      throw new BadRequestException('Ảnh không được vượt quá 10MB');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG, WebP, GIF');
    }
  }

  private async getNextSessionImageSortOrder(sessionId: string): Promise<number> {
    const aggregate = await this.prisma.patientTreatmentSessionImage.aggregate({
      where: { patientTreatmentSessionId: sessionId },
      _max: { sortOrder: true },
    });

    return (aggregate._max?.sortOrder ?? -1) + 1;
  }

  /** Tạo buổi tối thiểu nếu chưa lưu — cho phép upload ảnh trước khi nhập nội dung */
  private async ensureSessionForImageUpload(
    serviceId: string,
    sessionNumber: number,
    performedById: string,
  ): Promise<{ id: string }> {
    const existing = await this.prisma.patientTreatmentSession.findUnique({
      where: {
        patientServiceRecordId_sessionNumber: {
          patientServiceRecordId: serviceId,
          sessionNumber,
        },
      },
      select: { id: true },
    });

    if (existing) return existing;

    return this.prisma.patientTreatmentSession.create({
      data: {
        patientServiceRecordId: serviceId,
        sessionNumber,
        treatmentContent: '',
        performedAt: new Date(),
        performedById,
      },
      select: { id: true },
    });
  }

  /**
   * Kiểm tra xem các vật tư tiêu hao có trùng ID không
   */
  private assertUniqueConsumableIds(lines: TreatmentSessionConsumableLineDto[]): void {
    const ids = lines.map((line) => line.consumableId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Không được chọn trùng vật tư');
    }
  }

  /**
   * Áp dụng vật tư tiêu hao lần đầu tiên
   * Tại sao lại là lần đầu tiên?
   * Vì lần đầu tiên thì chưa có vật tư tiêu hao nên cần áp dụng
   */
  private async applyConsumablesOnFirstSave(
    tx: Prisma.TransactionClient,
    sessionId: string,
    lines: TreatmentSessionConsumableLineDto[],
  ): Promise<void> {
    /**
     * Kiểm tra xem các vật tư tiêu hao có trùng ID không
     */
    this.assertUniqueConsumableIds(lines);
    /**
     * Nếu không có vật tư tiêu hao thì return
     */
    if (lines.length === 0) return;
    /**
     * Lặp qua các vật tư tiêu hao và áp dụng
     */
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      /**
       * Lấy vật tư tiêu hao
       */
      const consumable = await tx.consumable.findUnique({
        where: { id: line.consumableId },
      });
      if (!consumable?.isActive) {
        throw new BadRequestException('Vật tư không hợp lệ hoặc đã ngừng dùng');
      }
      /**
       * Cập nhật số lượng vật tư tiêu hao
       */
      const updated = await tx.consumable.updateMany({
        where: {
          id: line.consumableId,
          // giới hạn số lượng vật tư tiêu hao
          stockQuantity: { gte: line.quantity },
        },
        data: {
          // giảm số lượng vật tư tiêu hao
          stockQuantity: { decrement: line.quantity },
        },
      });
      // Nếu không có vật tư tiêu hao thì throw error
      if (updated.count === 0) {
        throw new BadRequestException(
          `"${consumable.name}" không đủ tồn (còn ${Number(consumable.stockQuantity)}, cần ${line.quantity})`,
        );
      }
      /**
       * Tạo vật tư tiêu hao
       * Tại sao lại là lần đầu tiên?
       * Vì lần đầu tiên thì chưa có vật tư tiêu hao nên cần tạo
       */
      await tx.treatmentSessionConsumable.create({
        data: {
          patientTreatmentSessionId: sessionId,
          consumableId: line.consumableId,
          nameSnapshot: consumable.name,
          unitSnapshot: consumable.unit,
          quantity: line.quantity,
          sortOrder: i,
        },
      });
    }
  }
}
