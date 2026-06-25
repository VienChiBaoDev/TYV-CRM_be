import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapPatientToDetailResponse,
  PatientDetailResponse,
} from './mappers/patient.mapper';

const patientInclude = {
  visits: {
    include: {
      herbs: { orderBy: { sortOrder: 'asc' as const } },
      clinicalImages: { orderBy: { sortOrder: 'asc' as const } },
      followUpsOriginated: true,
    },
    orderBy: { visitNumber: 'asc' as const },
  },
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) { }

  async findMedicalRecord(patientId: string): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: patientInclude,
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return mapPatientToDetailResponse(patient);
  }
}
