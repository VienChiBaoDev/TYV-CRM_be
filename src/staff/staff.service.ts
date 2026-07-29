import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

/** Chỉ trả các field an toàn — không bao giờ lộ passwordHash. */
const staffSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  clinicId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StaffSelect;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.staff.findMany({
      select: staffSelect,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Danh sách nhân sự active cho dropdown — không trả email. */
  findActiveOptions() {
    return this.prisma.staff.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        role: true,
        clinicId: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateStaffDto) {
    const email = dto.email.toLowerCase().trim();
    await this.ensureEmailAvailable(email);

    return this.prisma.staff.create({
      data: {
        email,
        passwordHash: await hash(dto.password, 10),
        fullName: dto.fullName,
        role: dto.role,
        clinicId: dto.clinicId ?? null,
        isActive: dto.isActive ?? true,
      },
      select: staffSelect,
    });
  }

  async update(id: string, dto: UpdateStaffDto) {
    await this.getOrThrow(id);

    const email = dto.email?.toLowerCase().trim();
    if (email) {
      await this.ensureEmailAvailable(email, id);
    }

    return this.prisma.staff.update({
      where: { id },
      data: {
        ...(email ? { email } : {}),
        ...(dto.password ? { passwordHash: await hash(dto.password, 10) } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.clinicId !== undefined ? { clinicId: dto.clinicId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: staffSelect,
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new ConflictException('Không thể xóa chính tài khoản đang đăng nhập');
    }
    await this.getOrThrow(id);
    await this.prisma.staff.delete({ where: { id } });
    return { success: true };
  }

  private async getOrThrow(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      select: { id: true },
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
