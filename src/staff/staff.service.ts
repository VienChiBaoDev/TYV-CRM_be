import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PermissionsService } from '../auth/permissions.service';
import type { PermissionCode } from '../auth/permissions';
import { getRoleDefaultPermissions } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

const staffSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  clinicLinks: { select: { clinicId: true } },
  permissions: { select: { permissionCode: true } },
} satisfies Prisma.StaffSelect;

type StaffRow = Prisma.StaffGetPayload<{ select: typeof staffSelect }>;

export interface StaffResponse {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  clinicIds: string[];
  permissionCodes: PermissionCode[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function mapStaffResponse(staff: StaffRow): StaffResponse {
  const { clinicLinks, permissions, ...rest } = staff;
  return {
    ...rest,
    clinicIds: clinicLinks.map((link) => link.clinicId),
    permissionCodes: permissions.map((row) => row.permissionCode as PermissionCode),
  };
}

function assertClinicIdsForRole(role: StaffRole, clinicIds: string[] | undefined): void {
  if (role === StaffRole.ADMIN) return;
  if (!clinicIds?.length) {
    throw new BadRequestException('Vui lòng chọn ít nhất một cơ sở');
  }
}

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<StaffResponse[]> {
    const rows = await this.prisma.staff.findMany({
      select: staffSelect,
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => {
      const response = mapStaffResponse(row);
      if (response.permissionCodes.length > 0) return response;
      return {
        ...response,
        permissionCodes: getRoleDefaultPermissions(row.role),
      };
    });
  }

  /** Danh sách nhân sự active cho dropdown — không trả email. */
  async findActiveOptions() {
    const rows = await this.prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        clinicLinks: { select: { clinicId: true } },
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map(({ clinicLinks, ...rest }) => ({
      ...rest,
      clinicIds: clinicLinks.map((link) => link.clinicId),
    }));
  }

  async create(dto: CreateStaffDto): Promise<StaffResponse> {
    const email = dto.email.toLowerCase().trim();
    await this.ensureEmailAvailable(email);
    assertClinicIdsForRole(dto.role, dto.clinicIds);
    const permissionCodes = this.permissionsService.resolveIncomingCodes(
      dto.role,
      dto.permissionCodes,
    );
    const passwordHash = await hash(dto.password, 10);

    const staff = await this.prisma.$transaction(async (tx) => {
      const created = await tx.staff.create({
        data: {
          email,
          passwordHash,
          fullName: dto.fullName,
          role: dto.role,
          isActive: dto.isActive ?? true,
        },
        select: { id: true },
      });

      if (dto.role !== StaffRole.ADMIN && dto.clinicIds?.length) {
        await tx.staffClinic.createMany({
          data: dto.clinicIds.map((clinicId) => ({
            staffId: created.id,
            clinicId,
          })),
        });
      }

      await this.permissionsService.replaceForStaff(tx, created.id, permissionCodes);

      return tx.staff.findUniqueOrThrow({
        where: { id: created.id },
        select: staffSelect,
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    this.permissionsService.clearStaffCache(staff.id);
    return mapStaffResponse(staff);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<StaffResponse> {
    const current = await this.getOrThrow(id);
    const nextRole = dto.role ?? current.role;
    const nextClinicIds =
      dto.clinicIds !== undefined
        ? dto.clinicIds
        : current.clinicLinks.map((link) => link.clinicId);

    assertClinicIdsForRole(nextRole, nextClinicIds);

    const email = dto.email?.toLowerCase().trim();
    if (email) {
      await this.ensureEmailAvailable(email, id);
    }
    const passwordHash = dto.password ? await hash(dto.password, 10) : undefined;

    const staff = await this.prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id },
        data: {
          ...(email ? { email } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      if (dto.clinicIds !== undefined || dto.role !== undefined) {
        await tx.staffClinic.deleteMany({ where: { staffId: id } });
        if (nextRole !== StaffRole.ADMIN && nextClinicIds.length) {
          await tx.staffClinic.createMany({
            data: nextClinicIds.map((clinicId) => ({ staffId: id, clinicId })),
          });
        }
      }

      if (dto.permissionCodes !== undefined) {
        await this.permissionsService.replaceForStaff(
          tx,
          id,
          this.permissionsService.resolveIncomingCodes(nextRole, dto.permissionCodes),
        );
      } else if (dto.role !== undefined) {
        // Role đổi mà không gửi checklist → áp mặc định role mới.
        await this.permissionsService.replaceForStaff(
          tx,
          id,
          this.permissionsService.resolveIncomingCodes(nextRole, undefined),
        );
      }

      return tx.staff.findUniqueOrThrow({ where: { id }, select: staffSelect });
    }, PRISMA_TRANSACTION_OPTIONS);

    if (dto.permissionCodes !== undefined || dto.role !== undefined) {
      this.permissionsService.clearStaffCache(id);
    }
    return mapStaffResponse(staff);
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ConflictException('Không thể xóa chính tài khoản đang đăng nhập');
    }
    await this.getOrThrow(id);
    await this.prisma.staff.delete({ where: { id } });
    return { success: true };
  }

  private async getOrThrow(id: string): Promise<StaffRow> {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: staffSelect,
    });
    if (!staff) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }
    return staff;
  }

  private async ensureEmailAvailable(email: string, exceptId?: string) {
    const existing = await this.prisma.staff.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Email đã được sử dụng');
    }
  }
}
