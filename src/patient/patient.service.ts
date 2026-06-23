import { Injectable, NotFoundException } from '@nestjs/common';
import { ClinicBranch, CustomerStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

interface FindPatientsParams {
  search?: string;
  branch?: ClinicBranch;
  referrerId?: string;
}

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePatientDto) {
    const patientCode = await this.generatePatientCode();

    return this.prisma.patient.create({
      data: {
        patientCode,
        fullName: dto.fullName,
        gender: dto.gender,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        occupation: dto.occupation,
        address: dto.address,
        source: dto.source,
        clinicBranch: dto.clinicBranch ?? ClinicBranch.HANG_BONG,
        customerStatus: CustomerStatus.LEAD,
        referrerId: dto.referrerId,
        avatarInitials: this.buildInitials(dto.fullName),
      },
    });
  }

  findAll(params: FindPatientsParams) {
    const where: Prisma.PatientWhereInput = {
      ...(params.branch ? { clinicBranch: params.branch } : {}),
      ...(params.referrerId ? { referrerId: params.referrerId } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { phone: { contains: params.search } },
              { patientCode: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { referrer: { select: { id: true, fullName: true } } },
    });
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { referrer: { select: { id: true, fullName: true } } },
    });

    if (!patient) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    return patient;
  }

  /** Sinh mã khách hàng dạng TYV00000001, lùi theo số lượng hiện có. */
  private async generatePatientCode(): Promise<string> {
    const count = await this.prisma.patient.count();
    for (let i = 1; i <= 50; i++) {
      const code = `TYV${String(count + i).padStart(8, '0')}`;
      const existing = await this.prisma.patient.findUnique({
        where: { patientCode: code },
        select: { id: true },
      });
      if (!existing) {
        return code;
      }
    }
    // Cực hiếm: rơi vào đây khi nhiều bản ghi trùng — dùng timestamp đảm bảo duy nhất.
    return `TYV${Date.now()}`;
  }

  private buildInitials(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
