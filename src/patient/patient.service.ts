import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, Prisma } from '@prisma/client';
import type { JwtPayloadUser } from '../auth/types';
import { assertClinicAccess } from '../auth/access/clinic-access';
import { assertPatientAccess } from '../auth/access/patient-access';
import { buildInitials } from '../common/mapper-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { mapPatientToDetailResponse, PatientDetailResponse } from './mappers/patient.mapper';

interface FindPatientsParams {
  search?: string;
  clinicId?: string;
  referrerId?: string;
}

const patientInclude = {
  clinic: { select: { id: true, name: true } },
  assignedDoctors: { select: { id: true, fullName: true } },
  assignedAssistants: { select: { id: true, fullName: true } },
  visits: {
    include: {
      herbs: { orderBy: { sortOrder: 'asc' as const } },
      clinicalImages: { orderBy: { sortOrder: 'asc' as const } },
      followUpsOriginated: {
        include: {
          clinic: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { visitNumber: 'asc' as const },
  },
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePatientDto, user: JwtPayloadUser) {
    if (!dto.clinicId) {
      throw new BadRequestException('Vui lòng chọn cơ sở');
    }
    await assertClinicAccess(this.prisma, user, dto.clinicId);

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
        clinicId: dto.clinicId,
        customerStatus: CustomerStatus.LEAD,
        referrerId: dto.referrerId,
        avatarInitials: buildInitials(dto.fullName),
        assignedDoctors: {
          connect: dto.assignedDoctorIds.map((staffId) => ({ id: staffId })),
        },
        assignedAssistants: {
          connect: dto.assignedAssistantIds.map((staffId) => ({ id: staffId })),
        },
      },
    });
  }

  /** Sửa hồ sơ khách hàng, gồm cập nhật lại danh sách bác sĩ / trợ lý phụ trách. */
  async update(id: string, dto: UpdatePatientDto, user: JwtPayloadUser) {
    await assertPatientAccess(this.prisma, user, id, 'edit');
    if (dto.clinicId !== undefined) {
      await assertClinicAccess(this.prisma, user, dto.clinicId);
    }
    if (dto.assignedDoctorIds !== undefined && dto.assignedDoctorIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một bác sĩ phụ trách');
    }
    if (dto.assignedAssistantIds !== undefined && dto.assignedAssistantIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một trợ lý phụ trách');
    }

    return this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.fullName !== undefined && {
          fullName: dto.fullName,
          avatarInitials: buildInitials(dto.fullName),
        }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.occupation !== undefined && { occupation: dto.occupation }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.source !== undefined && { source: dto.source }),
        ...(dto.clinicId !== undefined && { clinicId: dto.clinicId }),
        ...(dto.referrerId !== undefined && { referrerId: dto.referrerId }),
        // set thay thế toàn bộ danh sách phụ trách khi payload có gửi field tương ứng
        ...(dto.assignedDoctorIds !== undefined && {
          assignedDoctors: { set: dto.assignedDoctorIds.map((sid) => ({ id: sid })) },
        }),
        ...(dto.assignedAssistantIds !== undefined && {
          assignedAssistants: { set: dto.assignedAssistantIds.map((sid) => ({ id: sid })) },
        }),
      },
      include: {
        referrer: { select: { id: true, fullName: true } },
        assignedDoctors: { select: { id: true, fullName: true } },
        assignedAssistants: { select: { id: true, fullName: true } },
      },
    });
  }

  async findAll(params: FindPatientsParams, user: JwtPayloadUser) {
    await assertClinicAccess(this.prisma, user, params.clinicId);
    const conditions: Prisma.PatientWhereInput[] = [];

    if (params.clinicId) conditions.push({ clinicId: params.clinicId });
    if (params.referrerId) conditions.push({ referrerId: params.referrerId });
    if (params.search) {
      conditions.push({
        OR: [
          { fullName: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
          { patientCode: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }

    // Lọc quyền xem: ADMIN thấy tất cả; còn lại chỉ khách mình phụ trách.
    if (user.role !== 'ADMIN') {
      conditions.push({
        OR: [
          { assignedDoctors: { some: { id: user.id } } },
          { assignedAssistants: { some: { id: user.id } } },
        ],
      });
    }

    return this.prisma.patient.findMany({
      where: conditions.length ? { AND: conditions } : {},
      orderBy: { createdAt: 'desc' },
      include: { referrer: { select: { id: true, fullName: true } } },
    });
  }

  async findOne(id: string, user: JwtPayloadUser) {
    await assertPatientAccess(this.prisma, user, id);

    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        referrer: { select: { id: true, fullName: true } },
        assignedDoctors: { select: { id: true, fullName: true } },
        assignedAssistants: { select: { id: true, fullName: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    return patient;
  }
  // Lấy chi tiết mỗi lần khám của khách hàng
  async findMedicalRecord(
    patientId: string,
    user: JwtPayloadUser,
  ): Promise<PatientDetailResponse> {
    await assertPatientAccess(this.prisma, user, patientId);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: patientInclude,
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return mapPatientToDetailResponse(patient);
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
}
