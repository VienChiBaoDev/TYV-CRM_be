import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClinicBranch, CustomerStatus, Prisma } from '@prisma/client';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { buildInitials } from '../common/mapper-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { mapPatientToDetailResponse, PatientDetailResponse } from './mappers/patient.mapper';

interface FindPatientsParams {
  search?: string;
  branch?: ClinicBranch;
  referrerId?: string;
}

const patientInclude = {
  assignedDoctors: { select: { id: true, fullName: true } },
  assignedAssistants: { select: { id: true, fullName: true } },
  visits: {
    include: {
      herbs: { orderBy: { sortOrder: 'asc' as const } },
      clinicalImages: { orderBy: { sortOrder: 'asc' as const } },
      followUpsOriginated: true,
    },
    orderBy: { visitNumber: 'asc' as const },
  },
} satisfies Prisma.PatientInclude;

/** Quyền xem hồ sơ: ADMIN xem tất cả; hồ sơ chưa gán ai thì mọi người xem được;
 *  còn lại chỉ bác sĩ / trợ lý được gán mới xem được. */
function canAccess(
  assigned: { assignedDoctors: { id: string }[]; assignedAssistants: { id: string }[] },
  user: JwtPayloadUser,
): boolean {
  if (user.role === 'ADMIN') return true;
  if (assigned.assignedDoctors.length === 0 && assigned.assignedAssistants.length === 0) {
    return true;
  }
  return (
    assigned.assignedDoctors.some((staff) => staff.id === user.id) ||
    assigned.assignedAssistants.some((staff) => staff.id === user.id)
  );
}

// Quyền sửa hồ sơ dùng chung quy tắc với quyền xem.
const canView = canAccess;
const canEdit = canAccess;

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
        avatarInitials: buildInitials(dto.fullName),
        assignedDoctors: dto.assignedDoctorIds?.length
          ? { connect: dto.assignedDoctorIds.map((id) => ({ id })) }
          : undefined,
        assignedAssistants: dto.assignedAssistantIds?.length
          ? { connect: dto.assignedAssistantIds.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  /** Sửa hồ sơ khách hàng, gồm cập nhật lại danh sách bác sĩ / trợ lý phụ trách. */
  async update(id: string, dto: UpdatePatientDto, user: JwtPayloadUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        assignedDoctors: { select: { id: true } },
        assignedAssistants: { select: { id: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }
    if (!canEdit(patient, user)) {
      throw new ForbiddenException('Bạn không có quyền sửa hồ sơ này');
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
        ...(dto.clinicBranch !== undefined && { clinicBranch: dto.clinicBranch }),
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

  findAll(params: FindPatientsParams, user: JwtPayloadUser) {
    const conditions: Prisma.PatientWhereInput[] = [];

    if (params.branch) conditions.push({ clinicBranch: params.branch });
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

    // Lọc quyền xem: ADMIN thấy tất cả; còn lại chỉ thấy hồ sơ chưa gán ai hoặc gán cho mình.
    if (user.role !== 'ADMIN') {
      conditions.push({
        OR: [
          // Hồ sơ chưa gán bác sĩ lẫn trợ lý → mọi người xem được
          {
            AND: [
              { assignedDoctors: { none: {} } },
              { assignedAssistants: { none: {} } },
            ],
          },
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

    if (!canView(patient, user)) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ này');
    }

    return patient;
  }
  // Lấy chi tiết mỗi lần khám của khách hàng
  async findMedicalRecord(
    patientId: string,
    user: JwtPayloadUser,
  ): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: patientInclude,
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (!canView(patient, user)) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ này');
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
