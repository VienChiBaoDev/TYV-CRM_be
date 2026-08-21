import { BadRequestException, Injectable } from '@nestjs/common';
import type { JwtPayloadUser } from '../auth/types';
import { assertPatientAccess } from '../auth/access/patient-access';
import { PrismaService } from '../prisma/prisma.service';
import { AiIntegrationClient } from './ai-integration.client';
import type { AiIntegrationSuggestResponse } from './ai-integration.types';
import { SuggestPrescriptionDto } from './dto/suggest-prescription.dto';

/**
 * Bridge FE → TYV-CRM_ai.
 * Không chứa logic DeepSeek/prompt — chỉ auth, lấy context CRM, gọi AI service.
 */
@Injectable()
export class AiIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiIntegrationClient,
  ) {}

  async suggestPrescription(
    patientId: string,
    dto: SuggestPrescriptionDto,
    user: JwtPayloadUser,
  ): Promise<AiIntegrationSuggestResponse> {
    const symptoms = dto.symptoms?.trim();
    if (!symptoms) {
      throw new BadRequestException(
        'Cần nhập triệu chứng & bệnh sử trước khi gợi ý AI.',
      );
    }

    await assertPatientAccess(this.prisma, user, patientId);

    const [patient, recentVisits, medicines, formulaTemplates] =
      await Promise.all([
        this.prisma.patient.findUnique({
          where: { id: patientId },
          select: {
            fullName: true,
            gender: true,
            birthDate: true,
            dietRestrictions: true,
            tags: true,
          },
        }),
        this.prisma.medicalVisit.findMany({
          where: { patientId },
          orderBy: { visitDate: 'desc' },
          take: 3,
          select: {
            visitNumber: true,
            visitDate: true,
            symptoms: true,
            prescriptionFormula: true,
            prescriptionDosage: true,
            herbs: {
              orderBy: { sortOrder: 'asc' },
              select: { name: true, weight: true },
            },
          },
        }),
        this.prisma.medicine.findMany({
          orderBy: { name: 'asc' },
          take: 400,
          select: {
            id: true,
            name: true,
            unit: true,
            unitPrice: true,
          },
        }),
        this.prisma.prescriptionFormulaTemplate.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 40,
          select: {
            name: true,
            dosage: true,
            herbs: {
              orderBy: { sortOrder: 'asc' },
              select: { name: true, weight: true },
            },
          },
        }),
      ]);

    const age = patient?.birthDate ? calcAgeYears(patient.birthDate) : null;

    return this.aiClient.suggestPrescription({
      symptoms,
      bloodPressure: dto.bloodPressure,
      pulse: dto.pulse,
      labResults: dto.labResults,
      pulseDiagnosis: dto.pulseDiagnosis,
      patient: {
        fullName: patient?.fullName ?? 'Không rõ',
        gender: patient?.gender ?? null,
        age,
        dietRestrictions: patient?.dietRestrictions ?? [],
        tags: patient?.tags ?? [],
      },
      recentVisits: recentVisits.map((visit) => ({
        visitNumber: visit.visitNumber,
        visitDate: visit.visitDate.toISOString().slice(0, 10),
        symptoms: visit.symptoms,
        prescriptionFormula: visit.prescriptionFormula,
        prescriptionDosage: visit.prescriptionDosage,
        herbs: visit.herbs.map((herb) => `${herb.name} ${herb.weight}`.trim()),
      })),
      medicines: medicines.map((medicine) => ({
        id: medicine.id,
        name: medicine.name,
        unit: medicine.unit,
        unitPrice: Number(medicine.unitPrice),
      })),
      formulas: formulaTemplates.map((formula) => ({
        name: formula.name,
        dosage: formula.dosage,
        herbs: formula.herbs.map((herb) => `${herb.name} ${herb.weight}`.trim()),
      })),
    });
  }
}

function calcAgeYears(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}
