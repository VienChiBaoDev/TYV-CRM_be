import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffShiftType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffShiftDto } from './dto/create-staff-shift.dto';
import { QueryStaffShiftDto } from './dto/query-staff-shift.dto';
import { UpdateStaffShiftDto } from './dto/update-staff-shift.dto';
import { assertValidTimeRange, rangesOverlap, shouldCheckWorkOverlap } from './staff-shift.rules';

const shiftInclude = {
  staff: {
    select: { id: true, fullName: true, role: true, clinicBranch: true },
  },
} satisfies Prisma.StaffShiftInclude;

@Injectable()
export class StaffShiftService {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Lấy tất cả các ca làm của một nhân viên.
   */
  findAll(params: QueryStaffShiftDto) {
    const where: Prisma.StaffShiftWhereInput = {
      staffId: params.staffId,
      ...(params.branch ? { clinicBranch: params.branch } : {}),
      startAt: { gte: new Date(params.from) },
      endAt: { lte: new Date(params.to) },
    };

    return this.prisma.staffShift.findMany({
      where,
      include: shiftInclude,
      orderBy: { startAt: 'asc' },
    });
  }
  /**
   * Lấy một ca làm theo id.
   */
  async findOne(id: string) {
    const shift = await this.prisma.staffShift.findUnique({
      where: { id },
      include: shiftInclude,
    });
    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm');
    }
    return shift;
  }

  /**
   * Tạo mới một ca làm.
   */
  async create(dto: CreateStaffShiftDto) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    /** Kiểm tra xem thời gian bắt đầu có lớn hơn thời gian kết thúc không. */
    this.guardTimeRange(startAt, endAt);

    /** Kiểm tra xem nhân viên có tồn tại và hoạt động không. */
    const staff = await this.prisma.staff.findUnique({
      where: { id: dto.staffId },
      select: { id: true, isActive: true },
    });
    if (!staff?.isActive) {
      throw new NotFoundException('Không tìm thấy nhân viên hoặc đã ngừng hoạt động');
    }

    /** Kiểm tra xem có ca làm trong khung giờ này không. */
    if (shouldCheckWorkOverlap(dto.type)) {
      await this.assertNoWorkOverlap(dto.staffId, startAt, endAt);
    }

    return this.prisma.staffShift.create({
      data: {
        staffId: dto.staffId,
        clinicBranch: dto.clinicBranch,
        type: dto.type,
        startAt,
        endAt,
        note: dto.note,
      },
      include: shiftInclude,
    });
  }

  /**
   * Cập nhật một ca làm.
   */
  async update(id: string, dto: UpdateStaffShiftDto) {
    const current = await this.findOne(id);

    const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : current.endAt;
    /** Kiểm tra xem thời gian bắt đầu có lớn hơn thời gian kết thúc không. */
    const type = dto.type ?? current.type;

    /** Kiểm tra xem thời gian bắt đầu có lớn hơn thời gian kết thúc không. */
    this.guardTimeRange(startAt, endAt);

    /** Kiểm tra xem có ca làm trong khung giờ này không. */
    if (shouldCheckWorkOverlap(type)) {
      await this.assertNoWorkOverlap(current.staffId, startAt, endAt, id);
    }

    return this.prisma.staffShift.update({
      where: { id },
      data: {
        ...(dto.clinicBranch !== undefined ? { clinicBranch: dto.clinicBranch } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.startAt !== undefined ? { startAt } : {}),
        ...(dto.endAt !== undefined ? { endAt } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      include: shiftInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.staffShift.delete({ where: { id } });
    return { success: true };
  }

  /** Phase 2: gọi từ AppointmentService */
  async isStaffWorking(staffId: string, at: Date): Promise<boolean> {
    const shift = await this.prisma.staffShift.findFirst({
      where: {
        staffId,
        type: StaffShiftType.WORK,
        startAt: { lte: at },
        endAt: { gt: at },
      },
      select: { id: true },
    });
    return Boolean(shift);
  }

  /**
   * Kiểm tra xem thời gian bắt đầu có lớn hơn thời gian kết thúc không.
   */
  private guardTimeRange(startAt: Date, endAt: Date): void {
    try {
      assertValidTimeRange(startAt, endAt);
    } catch {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }
  }

  /**
   * Kiểm tra xem có ca làm trong khung giờ này không.
   */
  private async assertNoWorkOverlap(
    staffId: string,
    startAt: Date,
    endAt: Date,
    exceptId?: string,
  ): Promise<void> {
    const existing = await this.prisma.staffShift.findMany({
      where: {
        staffId,
        type: StaffShiftType.WORK,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });

    const candidate = { startAt, endAt };
    const hasOverlap = existing.some((row) =>
      rangesOverlap(candidate, { startAt: row.startAt, endAt: row.endAt }),
    );

    if (hasOverlap) {
      throw new ConflictException('Nhân viên đã có ca làm trong khung giờ này');
    }
  }
}
