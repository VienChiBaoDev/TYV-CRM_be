import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

const ORDER_BY: Prisma.ClinicOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

@Injectable()
export class ClinicService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toàn bộ cơ sở, kể cả đã tắt — dùng cho màn Cài đặt. */
  findAll() {
    return this.prisma.clinic.findMany({ orderBy: ORDER_BY });
  }

  /** Chỉ cơ sở đang bật — dùng cho ô chọn trên UI. */
  findActiveOptions() {
    return this.prisma.clinic.findMany({
      where: { isActive: true },
      orderBy: ORDER_BY,
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  }

  async create(dto: CreateClinicDto) {
    const code = dto.code.trim().toUpperCase();
    await this.ensureCodeAvailable(code);

    return this.prisma.clinic.create({
      data: {
        code,
        name: dto.name.trim(),
        address: dto.address?.trim() || null,
        note: dto.note?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateClinicDto) {
    const current = await this.findOne(id);

    const code =
      dto.code !== undefined ? dto.code.trim().toUpperCase() : current.code;
    if (code !== current.code) {
      await this.ensureCodeAvailable(code, id);
    }

    return this.prisma.clinic.update({
      where: { id },
      data: {
        code,
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.address !== undefined && {
          address: dto.address?.trim() || null,
        }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * Cơ sở đã gắn patient/staff/appointment/shift/follow-up thì không xóa cứng —
   * chỉ tắt để giữ FK và lịch sử.
   */
  async remove(id: string) {
    await this.findOne(id);

    const [staffCount, shiftCount, patientCount, appointmentCount, followUpCount] =
      await Promise.all([
        this.prisma.staff.count({ where: { clinicId: id } }),
        this.prisma.staffShift.count({ where: { clinicId: id } }),
        this.prisma.patient.count({ where: { clinicId: id } }),
        this.prisma.appointment.count({ where: { clinicId: id } }),
        this.prisma.patientFollowUp.count({ where: { clinicId: id } }),
      ]);

    const used =
      staffCount + shiftCount + patientCount + appointmentCount + followUpCount > 0;

    if (used) {
      return this.prisma.clinic.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.clinic.delete({ where: { id } });
  }

  private async findOne(id: string) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id } });
    if (!clinic) {
      throw new NotFoundException('Không tìm thấy cơ sở');
    }
    return clinic;
  }

  private async ensureCodeAvailable(code: string, exceptId?: string) {
    const existing = await this.prisma.clinic.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Mã cơ sở đã tồn tại');
    }
  }
}
