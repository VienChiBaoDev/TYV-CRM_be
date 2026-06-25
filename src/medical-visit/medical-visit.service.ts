import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ClinicalImageCategory, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { CreateMedicalVisitDto } from './dto/create-medical-visit.dto';
import { UpdateMedicalVisitDto } from './dto/update-medical-visit.dto';
import { FollowUpPlanDto } from './dto/create-medical-visit.dto';
import {
  MedicalVisitResponse,
  VisitClinicalImageResponse,
  mapVisitToResponse,
  parseDateOnly,
  resolveClinicBranchFromLocation,
  subtractDays,
  toCustomerStatus,
} from './mappers/visit.mapper';

const MAX_CLINICAL_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const CATEGORY_STORAGE_FOLDER: Record<ClinicalImageCategory, string> = {
  DIAGNOSIS: 'diagnosis',
  LAB_RESULT: 'lab-result',
  OTHER: 'other',
};

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const visitInclude = {
  herbs: { orderBy: { sortOrder: 'asc' as const } },
  clinicalImages: { orderBy: { sortOrder: 'asc' as const } },
  followUpsOriginated: true,
} satisfies Prisma.MedicalVisitInclude;

@Injectable()
export class MedicalVisitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseStorage: SupabaseStorageService,
  ) {}

  async findAllByPatient(patientId: string): Promise<MedicalVisitResponse[]> {
    await this.ensurePatientExists(patientId);

    const visits = await this.prisma.medicalVisit.findMany({
      where: { patientId },
      include: visitInclude,
      orderBy: [{ visitDate: 'desc' }, { visitNumber: 'desc' }],
    });

    return visits.map(mapVisitToResponse);
  }

  async findOne(patientId: string, visitId: string): Promise<MedicalVisitResponse> {
    const visit = await this.getVisitOrThrow(patientId, visitId);
    return mapVisitToResponse(visit);
  }

  async create(patientId: string, dto: CreateMedicalVisitDto): Promise<MedicalVisitResponse> {
    await this.ensurePatientExists(patientId);

    const visit = await this.prisma.$transaction(async (tx) => {
      // Lấy số thứ tự của lần khám mới nhất theo id khách hàng
      const visitNumber = await this.getNextVisitNumber(tx, patientId);
      // Xây dựng dữ liệu lần khám mới
      const visitData = this.buildVisitCreateData(patientId, visitNumber, dto.visit);

      const createdVisit = await tx.medicalVisit.create({
        // Tạo lần khám mới
        data: visitData,
        include: visitInclude,
      });

      if (dto.followUpPlan) {
        // Tạo lần theo dõi sau khám
        await this.upsertFollowUpPlan(
          tx,
          patientId,
          createdVisit.id,
          dto.visit.doctorName,
          dto.visit.location,
          dto.followUpPlan,
        );
      }
      // Lấy lần khám mới nhất
      return tx.medicalVisit.findUniqueOrThrow({
        where: { id: createdVisit.id },
        include: visitInclude,
      });
    });

    // Trả về lần khám mới nhất
    return mapVisitToResponse(visit);
  }

  async update(
    patientId: string,
    visitId: string,
    dto: UpdateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    // Lấy lần khám cũ
    const existing = await this.getVisitOrThrow(patientId, visitId);

    const visit = await this.prisma.$transaction(async (tx) => {
      if (dto.visit) {
        // Cập nhật lần khám cũ
        await tx.medicalVisit.update({
          where: { id: visitId },
          data: this.buildVisitUpdateData(dto.visit),
        });

        if (dto.visit.herbs !== undefined) {
          // Xóa các loại thuốc cũ
          await tx.visitHerb.deleteMany({ where: { visitId } });
          if (dto.visit.herbs.length > 0) {
            // Tạo các loại thuốc mới
            await tx.visitHerb.createMany({
              data: dto.visit.herbs.map((herb, index) => ({
                visitId,
                name: herb.name,
                weight: herb.weight,
                sortOrder: index,
              })),
            });
          }
        }
        // Cập nhật các ảnh khám cũ
        if (dto.visit.clinicalImages !== undefined) {
          // Xóa các ảnh khám cũ
          await tx.visitClinicalImage.deleteMany({ where: { visitId } });
          // Tạo các ảnh khám mới
          if (dto.visit.clinicalImages.length > 0) {
            await tx.visitClinicalImage.createMany({
              data: dto.visit.clinicalImages.map((image, index) => ({
                visitId,
                imageUrl: image.imageUrl,
                category: ClinicalImageCategory.OTHER,
                sortOrder: index,
              })),
            });
          }
        }
      }
      // Xóa lần theo dõi sau khám
      if (dto.followUpPlan === null) {
        await tx.patientFollowUp.deleteMany({
          where: { originatingVisitId: visitId },
        });
        // Cập nhật ngày khám tiếp theo
        await this.syncPatientNextFollowUpDate(tx, patientId);
      } else if (dto.followUpPlan) {
        // Tạo lần theo dõi sau khám
        const doctorName = dto.visit?.doctorName ?? existing.doctorName;
        const location = dto.visit?.location ?? existing.location;
        await this.upsertFollowUpPlan(
          tx,
          patientId,
          visitId,
          doctorName,
          location,
          dto.followUpPlan,
        );
      }

      return tx.medicalVisit.findUniqueOrThrow({
        where: { id: visitId },
        include: visitInclude,
      });
    });

    return mapVisitToResponse(visit);
  }

  async remove(patientId: string, visitId: string): Promise<void> {
    await this.getVisitOrThrow(patientId, visitId);

    await this.prisma.$transaction(async (tx) => {
      await tx.medicalVisit.delete({ where: { id: visitId } });
      await this.syncPatientNextFollowUpDate(tx, patientId);
    });
  }

  async uploadClinicalImage(
    patientId: string,
    visitId: string,
    file: Express.Multer.File,
    category: ClinicalImageCategory,
  ): Promise<VisitClinicalImageResponse> {
    // Lấy lần khám
    await this.getVisitOrThrow(patientId, visitId);
    // Kiểm tra file ảnh
    this.assertValidImageFile(file);
    // Lấy phần mở rộng của file ảnh

    const extension = MIME_EXTENSION[file.mimetype] ?? 'jpg';
    const folder = CATEGORY_STORAGE_FOLDER[category];
    // Tạo đường dẫn lưu trữ ảnh
    const storagePath = `patients/${patientId}/visits/${visitId}/${folder}/${randomUUID()}.${extension}`;

    // Tải ảnh lên Supabase
    const uploaded = await this.supabaseStorage.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Lấy số thứ tự của ảnh mới nhất
    const sortOrder = await this.getNextImageSortOrder(visitId, category);
    // Tạo ảnh mới

    const image = await this.prisma.visitClinicalImage.create({
      data: {
        visitId,
        imageUrl: uploaded.publicUrl,
        storagePath: uploaded.storagePath,
        category,
        sortOrder,
      },
    });

    // Trả về ảnh mới nhất
    return {
      id: image.id,
      imageUrl: image.imageUrl,
      category: image.category,
      sortOrder: image.sortOrder,
    };
  }

  async deleteClinicalImage(patientId: string, visitId: string, imageId: string): Promise<void> {
    // Lấy lần khám
    await this.getVisitOrThrow(patientId, visitId);
    // Lấy ảnh khám
    // Lấy ảnh khám theo id lần khám và id ảnh khám
    const image = await this.prisma.visitClinicalImage.findFirst({
      where: { id: imageId, visitId },
    });

    // Kiểm tra ảnh khám
    if (!image) {
      throw new NotFoundException('Clinical image not found');
    }

    // Xóa ảnh khám từ Supabase
    if (image.storagePath) {
      await this.supabaseStorage.removeObject(image.storagePath);
    }

    // Xóa ảnh khám từ database
    await this.prisma.visitClinicalImage.delete({ where: { id: imageId } });
  }
  // Kiểm tra khách hàng tồn tại
  private async ensurePatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  }
  // Lấy lần khám theo id khách hàng và id lần khám
  private async getVisitOrThrow(patientId: string, visitId: string) {
    const visit = await this.prisma.medicalVisit.findFirst({
      where: { id: visitId, patientId },
      include: visitInclude,
    });

    if (!visit) {
      throw new NotFoundException('Medical visit not found');
    }

    return visit;
  }

  private async getNextVisitNumber(
    tx: Prisma.TransactionClient,
    patientId: string,
  ): Promise<number> {
    const aggregate = await tx.medicalVisit.aggregate({
      where: { patientId },
      _max: { visitNumber: true },
    });

    return (aggregate._max.visitNumber ?? 0) + 1;
  }

  private buildVisitCreateData(
    patientId: string,
    visitNumber: number,
    visit: CreateMedicalVisitDto['visit'],
  ): Prisma.MedicalVisitCreateInput {
    return {
      patient: { connect: { id: patientId } },
      visitNumber,
      title: visit.title,
      visitDate: parseDateOnly(visit.visitDate),
      doctorName: visit.doctorName,
      mode: visit.mode,
      location: visit.location,
      bloodPressure: visit.bloodPressure,
      pulse: visit.pulse,
      symptoms: visit.symptoms,
      pulseDiagnosisTa: visit.pulseDiagnosis?.ta,
      pulseDiagnosisHuu: visit.pulseDiagnosis?.huu,
      pulseDiagnosisBung: visit.pulseDiagnosis?.bung,
      prescriptionFormula: visit.prescriptionFormula,
      prescriptionDosage: visit.prescriptionDosage,
      labResults: visit.labResults,
      status: visit.status,
      herbs: visit.herbs?.length
        ? {
            create: visit.herbs.map((herb, index) => ({
              name: herb.name,
              weight: herb.weight,
              sortOrder: index,
            })),
          }
        : undefined,
      clinicalImages: visit.clinicalImages?.length
        ? {
            create: visit.clinicalImages.map((image, index) => ({
              imageUrl: image.imageUrl,
              category: ClinicalImageCategory.OTHER,
              sortOrder: index,
            })),
          }
        : undefined,
    };
  }

  private buildVisitUpdateData(
    visit: NonNullable<UpdateMedicalVisitDto['visit']>,
  ): Prisma.MedicalVisitUpdateInput {
    return {
      title: visit.title,
      visitDate: visit.visitDate ? parseDateOnly(visit.visitDate) : undefined,
      doctorName: visit.doctorName,
      mode: visit.mode,
      location: visit.location,
      bloodPressure: visit.bloodPressure,
      pulse: visit.pulse,
      symptoms: visit.symptoms,
      pulseDiagnosisTa: visit.pulseDiagnosis?.ta,
      pulseDiagnosisHuu: visit.pulseDiagnosis?.huu,
      pulseDiagnosisBung: visit.pulseDiagnosis?.bung,
      prescriptionFormula: visit.prescriptionFormula,
      prescriptionDosage: visit.prescriptionDosage,
      labResults: visit.labResults,
      status: visit.status,
    };
  }

  private async upsertFollowUpPlan(
    tx: Prisma.TransactionClient,
    patientId: string,
    originatingVisitId: string,
    physicianInCharge: string,
    location: string,
    plan: FollowUpPlanDto,
  ): Promise<void> {
    const followUpDate = parseDateOnly(plan.followUpDate);
    const assessmentDate = subtractDays(plan.followUpDate, plan.reminderDaysBefore);
    const facility = resolveClinicBranchFromLocation(location);
    const customerStatus = toCustomerStatus(plan.treatmentStatus);

    const existing = await tx.patientFollowUp.findFirst({
      where: { originatingVisitId },
    });

    if (existing) {
      await tx.patientFollowUp.update({
        where: { id: existing.id },
        data: {
          followUpDate,
          assessmentDate,
          physicianInCharge,
          facility,
        },
      });
    } else {
      await tx.patientFollowUp.create({
        data: {
          patientId,
          originatingVisitId,
          followUpDate,
          assessmentDate,
          physicianInCharge,
          facility,
        },
      });
    }
    // Xóa lịch tái khám cũ từ các lần khám trước khi lưu lịch mới
    await this.supersedeOlderIncompleteFollowUps(tx, patientId, originatingVisitId);

    await tx.patient.update({
      where: { id: patientId },
      data: {
        /** Cập nhật trạng thái khách hàng */
        customerStatus: customerStatus,
      },
    });

    await this.syncPatientNextFollowUpDate(tx, patientId);
  }

  /** Xóa lịch tái khám cũ từ các lần khám trước khi lưu lịch mới */
  private async supersedeOlderIncompleteFollowUps(
    tx: Prisma.TransactionClient,
    patientId: string,
    originatingVisitId: string,
  ): Promise<void> {
    const currentVisit = await tx.medicalVisit.findUnique({
      where: { id: originatingVisitId },
      select: { visitNumber: true },
    });
    if (!currentVisit) return;

    await tx.patientFollowUp.deleteMany({
      where: {
        patientId,
        completedVisitId: null,
        originatingVisitId: { not: originatingVisitId },
        originatingVisit: {
          visitNumber: { lt: currentVisit.visitNumber },
        },
      },
    });
  }

  private async syncPatientNextFollowUpDate(
    tx: Prisma.TransactionClient,
    patientId: string,
  ): Promise<void> {
    const latestFollowUp = await tx.patientFollowUp.findFirst({
      where: {
        patientId,
        completedVisitId: null,
      },
      orderBy: { followUpDate: 'desc' },
      select: { followUpDate: true },
    });

    await tx.patient.update({
      where: { id: patientId },
      data: {
        nextFollowUpDate: latestFollowUp?.followUpDate ?? null,
      },
    });
  }

  private assertValidImageFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    if (file.size > MAX_CLINICAL_IMAGE_BYTES) {
      throw new BadRequestException('Image file must be 10MB or smaller');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, and GIF images are allowed');
    }
  }

  private async getNextImageSortOrder(
    visitId: string,
    category: ClinicalImageCategory,
  ): Promise<number> {
    const aggregate = await this.prisma.visitClinicalImage.aggregate({
      where: { visitId, category },
      _max: { sortOrder: true },
    });

    return (aggregate._max?.sortOrder ?? -1) + 1;
  }
}
