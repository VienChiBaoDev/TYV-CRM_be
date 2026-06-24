import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMedicalVisitDto } from './dto/create-medical-visit.dto';
import { UpdateMedicalVisitDto } from './dto/update-medical-visit.dto';
import { FollowUpPlanDto } from './dto/create-medical-visit.dto';
import {
  MedicalVisitResponse,
  mapVisitToResponse,
  parseDateOnly,
  resolveClinicBranchFromLocation,
  subtractDays,
  toCustomerStatus,
} from './mappers/visit.mapper';

const visitInclude = {
  herbs: { orderBy: { sortOrder: 'asc' as const } },
  clinicalImages: { orderBy: { sortOrder: 'asc' as const } },
  followUpsOriginated: true,
} satisfies Prisma.MedicalVisitInclude;

@Injectable()
export class MedicalVisitService {
  constructor(private readonly prisma: PrismaService) {}

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
        customer_status: customerStatus,
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
}
