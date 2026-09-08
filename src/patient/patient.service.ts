import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerStatus, Prisma, StaffRole } from '@prisma/client';
import { assertClinicAccess } from '../auth/access/clinic-access';
import { assertPatientAccess } from '../auth/access/patient-access';
import type { JwtPayloadUser } from '../auth/types';
import { buildInitials } from '../common/mapper-utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ImportPatientsDto, ImportPatientsResponse } from './dto/import-patients.dto';
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
  async findMedicalRecord(patientId: string, user: JwtPayloadUser): Promise<PatientDetailResponse> {
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

  async importMany(dto: ImportPatientsDto, user: JwtPayloadUser): Promise<ImportPatientsResponse> {
    let created = 0;
    let skipped = 0;
    const errors: ImportPatientsResponse['errors'] = [];
    const seenPhones = new Set<string>();

    const clinicMap = await this.buildClinicLookupMap();
    const clinicAccessChecked = new Set<string>();
    const clinicAccessDenied = new Set<string>();
    const assignmentCache = new Map<
      string,
      { doctorIds: string[]; assistantIds: string[] }
    >();

    const normalizedPhones = dto.items.map((item) => item.phone.replace(/\s+/g, ''));
    const existingRows = await this.prisma.patient.findMany({
      where: { phone: { in: normalizedPhones } },
      select: { phone: true },
    });
    const existingPhones = new Set(existingRows.map((row) => row.phone));

    let codeSeq = await this.prisma.patient.count();

    for (let i = 0; i < dto.items.length; i++) {
      const row = i + 1;
      const item = dto.items[i];
      const fullName = item.fullName.trim();
      const phone = normalizedPhones[i];
      const clinicKey = item.clinicCode.trim().toUpperCase();

      if (seenPhones.has(phone)) {
        skipped++;
        errors.push({ row, message: `Trùng SĐT trong file: ${phone}` });
        continue;
      }
      seenPhones.add(phone);

      const clinicId = clinicMap.get(clinicKey);
      if (!clinicId) {
        skipped++;
        errors.push({
          row,
          message: `Không tìm thấy chi nhánh: "${item.clinicCode}"`,
        });
        continue;
      }

      if (clinicAccessDenied.has(clinicId)) {
        skipped++;
        errors.push({ row, message: 'Bạn không có quyền import vào chi nhánh này' });
        continue;
      }

      if (!clinicAccessChecked.has(clinicId)) {
        try {
          await assertClinicAccess(this.prisma, user, clinicId);
          clinicAccessChecked.add(clinicId);
        } catch {
          clinicAccessDenied.add(clinicId);
          skipped++;
          errors.push({ row, message: 'Bạn không có quyền import vào chi nhánh này' });
          continue;
        }
      }

      if (existingPhones.has(phone)) {
        skipped++;
        errors.push({ row, message: `SĐT đã tồn tại: ${phone}` });
        continue;
      }

      let assignments = assignmentCache.get(clinicId);
      if (!assignments) {
        try {
          assignments = await this.resolveImportAssignments(clinicId);
          assignmentCache.set(clinicId, assignments);
        } catch {
          errors.push({ row, message: 'Chi nhánh chưa có bác sĩ/trợ lý' });
          continue;
        }
      }

      codeSeq += 1;
      const patientCode = `TYV${String(codeSeq).padStart(8, '0')}`;

      try {
        await this.prisma.patient.create({
          data: {
            patientCode,
            fullName,
            gender: item.gender,
            phone,
            birthDate: item.birthDate ? new Date(item.birthDate) : undefined,
            address: item.address?.trim() || undefined,
            clinicId,
            customerStatus: CustomerStatus.LEAD,
            avatarInitials: buildInitials(fullName),
            ...(item.createdAt ? { createdAt: new Date(item.createdAt) } : {}),
            assignedDoctors: {
              connect: assignments.doctorIds.map((id) => ({ id })),
            },
            assignedAssistants: {
              connect: assignments.assistantIds.map((id) => ({ id })),
            },
          },
        });
        existingPhones.add(phone);
        created++;
      } catch {
        errors.push({ row, message: 'Không thể lưu dòng này' });
      }
    }

    return { created, skipped, errors };
  }

  /** Map mã/tên chi nhánh → clinicId */
  private async buildClinicLookupMap(): Promise<Map<string, string>> {
    const clinics = await this.prisma.clinic.findMany({
      select: { id: true, code: true, name: true },
    });

    const map = new Map<string, string>();
    for (const clinic of clinics) {
      map.set(clinic.code.toUpperCase(), clinic.id);
      map.set(clinic.name.trim().toUpperCase(), clinic.id);
    }
    return map;
  }

  /** Gán BS + trợ lý mặc định để nhân viên thấy khách sau import */
  private async resolveImportAssignments(clinicId: string) {
    const staff = await this.prisma.staff.findMany({
      where: {
        isActive: true,
        clinicLinks: { some: { clinicId } },
        role: { in: [StaffRole.DOCTOR, StaffRole.ASSISTANT] },
      },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });

    const doctorIds = staff.filter((s) => s.role === StaffRole.DOCTOR).map((s) => s.id);
    const assistantIds = staff.filter((s) => s.role === StaffRole.ASSISTANT).map((s) => s.id);

    if (doctorIds.length === 0 || assistantIds.length === 0) {
      throw new BadRequestException('Chi nhánh chưa có bác sĩ/trợ lý — không thể import');
    }

    return {
      doctorIds: [doctorIds[0]],
      assistantIds: [assistantIds[0]],
    };
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
