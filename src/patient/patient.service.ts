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
import { mapPatientToDetailResponse, PatientDetailResponse } from './mappers/patient.mapper';

interface FindPatientsParams {
  search?: string;
  branch?: ClinicBranch;
  referrerId?: string;
}

const patientInclude = {
  assignedStaff: { select: { id: true } },
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
 *  còn lại chỉ nhân viên được gán mới xem được. */
function canView(
  assignedStaff: { id: string }[],
  user: JwtPayloadUser,
): boolean {
  if (user.role === 'ADMIN') return true;
  if (assignedStaff.length === 0) return true;
  return assignedStaff.some((staff) => staff.id === user.id);
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
        avatarInitials: buildInitials(dto.fullName),
        assignedStaff: dto.assignedStaffIds?.length
          ? { connect: dto.assignedStaffIds.map((id) => ({ id })) }
          : undefined,
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
          { assignedStaff: { none: {} } },
          { assignedStaff: { some: { id: user.id } } },
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
        assignedStaff: { select: { id: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    if (!canView(patient.assignedStaff, user)) {
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

    if (!canView(patient.assignedStaff, user)) {
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
