import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { JwtPayloadUser } from '../auth/types';
import { assertPatientAccess } from '../auth/access/patient-access';
import { PrismaService } from '../prisma/prisma.service';

export interface MedicalCaseResponse {
  readonly id: string;
  readonly patientId: string;
  readonly formData: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

@Injectable()
export class MedicalCaseService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPatient(
    patientId: string,
    user: JwtPayloadUser,
  ): Promise<MedicalCaseResponse | null> {
    await assertPatientAccess(this.prisma, user, patientId);

    const medicalCase = await this.prisma.medicalCase.findUnique({
      where: { patientId },
    });

    if (!medicalCase) return null;

    return this.mapToResponse(medicalCase);
  }

  async upsert(
    patientId: string,
    formData: Record<string, unknown>,
    user: JwtPayloadUser,
  ): Promise<MedicalCaseResponse> {
    await assertPatientAccess(this.prisma, user, patientId, 'edit');

    const medicalCase = await this.prisma.medicalCase.upsert({
      where: { patientId },
      create: {
        patientId,
        formData: formData as Prisma.InputJsonValue,
      },
      update: {
        formData: formData as Prisma.InputJsonValue,
      },
    });

    return this.mapToResponse(medicalCase);
  }

  private mapToResponse(medicalCase: {
    id: string;
    patientId: string;
    formData: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): MedicalCaseResponse {
    return {
      id: medicalCase.id,
      patientId: medicalCase.patientId,
      formData: medicalCase.formData as Record<string, unknown>,
      createdAt: medicalCase.createdAt.toISOString(),
      updatedAt: medicalCase.updatedAt.toISOString(),
    };
  }
}
