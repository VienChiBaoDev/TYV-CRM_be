import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

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

  async findOne(
    patientId: string,
    visitId: string,
  ): Promise<MedicalVisitResponse> {
    const visit = await this.getVisitOrThrow(patientId, visitId);
    return mapVisitToResponse(visit);
  }

  async create(
    patientId: string,
    dto: CreateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    await this.ensurePatientExists(patientId);

    const visit = await this.prisma.$transaction(async (tx) => {
      const visitNumber = await this.getNextVisitNumber(tx, patientId);
      const visitData = this.buildVisitCreateData(patientId, visitNumber, dto.visit);

      const createdVisit = await tx.medicalVisit.create({
        data: visitData,
        include: visitInclude,
      });

      if (dto.followUpPlan) {
        await this.upsertFollowUpPlan(
          tx,
          patientId,
          createdVisit.id,
          dto.visit.doctorName,
          dto.visit.location,
          dto.followUpPlan,
        );
      }

      return tx.medicalVisit.findUniqueOrThrow({
        where: { id: createdVisit.id },
        include: visitInclude,
      });
    });

    return mapVisitToResponse(visit);
  }

  async update(
    patientId: string,
    visitId: string,
    dto: UpdateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    const existing = await this.getVisitOrThrow(patientId, visitId);

    const visit = await this.prisma.$transaction(async (tx) => {
      if (dto.visit) {
        await tx.medicalVisit.update({
          where: { id: visitId },
          data: this.buildVisitUpdateData(dto.visit),
        });

        if (dto.visit.herbs !== undefined) {
          await tx.visitHerb.deleteMany({ where: { visitId } });
          if (dto.visit.herbs.length > 0) {
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

        if (dto.visit.clinicalImages !== undefined) {
          await tx.visitClinicalImage.deleteMany({ where: { visitId } });
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

      if (dto.followUpPlan === null) {
        await tx.patientFollowUp.deleteMany({
          where: { originatingVisitId: visitId },
        });
        await this.syncPatientNextFollowUpDate(tx, patientId);
      } else if (dto.followUpPlan) {
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
    await this.getVisitOrThrow(patientId, visitId);
    this.assertValidImageFile(file);

    const extension = MIME_EXTENSION[file.mimetype] ?? 'jpg';
    const folder = CATEGORY_STORAGE_FOLDER[category];
    const storagePath = `patients/${patientId}/visits/${visitId}/${folder}/${randomUUID()}.${extension}`;

    const uploaded = await this.supabaseStorage.uploadObject(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    const sortOrder = await this.getNextImageSortOrder(visitId, category);

    const image = await this.prisma.visitClinicalImage.create({
      data: {
        visitId,
        imageUrl: uploaded.publicUrl,
        storagePath: uploaded.storagePath,
        category,
        sortOrder,
      },
    });

    return {
      id: image.id,
      imageUrl: image.imageUrl,
      category: image.category,
      sortOrder: image.sortOrder,
    };
  }

  async deleteClinicalImage(
    patientId: string,
    visitId: string,
    imageId: string,
  ): Promise<void> {
    await this.getVisitOrThrow(patientId, visitId);

    const image = await this.prisma.visitClinicalImage.findFirst({
      where: { id: imageId, visitId },
    });

    if (!image) {
      throw new NotFoundException('Clinical image not found');
    }

    if (image.storagePath) {
      await this.supabaseStorage.removeObject(image.storagePath);
    }

    await this.prisma.visitClinicalImage.delete({ where: { id: imageId } });
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  }

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

    await tx.patient.update({
      where: { id: patientId },
      data: {
        nextFollowUpDate: followUpDate,
        customerStatus: customerStatus,
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
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and GIF images are allowed',
      );
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
