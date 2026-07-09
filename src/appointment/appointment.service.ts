import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, ClinicBranch, Prisma, VisitMode, VisitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  assertAppointmentStatusTransition,
  CHECK_IN_ALLOWED_STATUSES,
} from './appointment-status.rules';
import { formatDateOnly } from '../medical-visit/mappers/visit.mapper';

// record để mapping branch với location
const BRANCH_TO_LOCATION: Record<ClinicBranch, string> = {
  [ClinicBranch.HANG_BONG]: 'Hàng Bông',
  [ClinicBranch.CAU_GIAY]: 'Cầu Giấy',
};

interface FindAppointmentsParams {
  branch?: ClinicBranch;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
}

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAppointmentDto) {
    this.assertValidTimeRange(dto.scheduledAt, dto.endedAt);

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        scheduledAt: new Date(dto.scheduledAt),
        endedAt: new Date(dto.endedAt),
        doctorName: dto.doctorName,
        assistantName: dto.assistantName,
        clinicBranch: dto.clinicBranch,
        note: dto.note,
      },
    });
  }

  findAll(params: FindAppointmentsParams) {
    const where: Prisma.AppointmentWhereInput = {
      ...(params.branch ? { clinicBranch: params.branch } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            scheduledAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const current = await this.findOne(id);

    if (dto.scheduledAt && dto.endedAt) {
      // Kiểm tra giờ bắt đầu và giờ kết thúc có hợp lệ
      this.assertValidTimeRange(dto.scheduledAt, dto.endedAt);
    } else if (dto.scheduledAt || dto.endedAt) {
      // Nếu giờ bắt đầu hoặc giờ kết thúc không được cung cấp, sử dụng giờ bắt đầu và giờ kết thúc của lịch hẹn hiện tại
      const scheduledAt = dto.scheduledAt ?? current.scheduledAt.toISOString();
      const endedAt = dto.endedAt ?? current.endedAt.toISOString();
      this.assertValidTimeRange(scheduledAt, endedAt);
    }

    if (dto.status) {
      assertAppointmentStatusTransition(current.status, dto.status, current.visitId);
    }

    if (dto.visitId !== undefined) {
      throw new BadRequestException('Không thể gán visitId qua cập nhật thường');
    }

    const isCancelling = dto.status === AppointmentStatus.CANCELLED;

    if (isCancelling) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id },
          data: {
            ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
            ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
            ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName } : {}),
            ...(dto.assistantName !== undefined ? { assistantName: dto.assistantName } : {}),
            ...(dto.clinicBranch ? { clinicBranch: dto.clinicBranch } : {}),
            status: AppointmentStatus.CANCELLED,
            ...(dto.note !== undefined ? { note: dto.note } : {}),
          },
          include: {
            patient: {
              select: { id: true, fullName: true, patientCode: true, phone: true },
            },
          },
        });
        await tx.patientFollowUp.updateMany({
          where: { scheduledAppointmentId: id },
          data: {
            scheduleStatus: 'NOT_SCHEDULED',
            scheduledAppointmentId: null,
          },
        });
        return updated;
      });
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
        ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName } : {}),
        ...(dto.assistantName !== undefined ? { assistantName: dto.assistantName } : {}),
        ...(dto.clinicBranch ? { clinicBranch: dto.clinicBranch } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  private assertValidTimeRange(scheduledAt: string, endedAt: string): void {
    const start = new Date(scheduledAt);
    const end = new Date(endedAt);

    if (end <= start) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }
  }
  // lấy số thứ tự của lượt khám tiếp theo cho bệnh nhân
  private async getNextVisitNumber(
    tx: Prisma.TransactionClient,
    patientId: string,
  ): Promise<number> {
    // lấy số thứ tự lượt khám lớn nhất của bệnh nhân
    // và cộng 1 để lấy số thứ tự tiếp theo
    // nếu không có lượt khám nào thì trả về 1
    // dùng aggregate để lấy số thứ tự lớn nhất
    const aggregate = await tx.medicalVisit.aggregate({
      where: { patientId },
      _max: { visitNumber: true },
    });
    return (aggregate._max.visitNumber ?? 0) + 1;
  }

  async checkIn(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });
    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }
    if (appointment.visitId) {
      throw new ConflictException('Lịch hẹn đã được tiếp nhận');
    }
    if (!CHECK_IN_ALLOWED_STATUSES.includes(appointment.status)) {
      throw new BadRequestException('Chỉ có thể tiếp nhận lịch ở trạng thái Đã đặt hoặc Xác nhận');
    }
    return this.prisma.$transaction(async (tx) => {
      const visitNumber = await this.getNextVisitNumber(tx, appointment.patientId);
      const visitDate = formatDateOnly(appointment.scheduledAt);

      const visit = await tx.medicalVisit.create({
        data: {
          patientId: appointment.patientId,
          visitNumber,
          title: `Khám theo lịch hẹn #${visitNumber}`,
          visitDate: new Date(`${visitDate}T00:00:00.000Z`),
          doctorName: appointment.doctorName ?? 'Chưa phân công',
          mode: VisitMode.IN_PERSON,
          location: BRANCH_TO_LOCATION[appointment.clinicBranch],
          status: VisitStatus.INITIAL_EXAM,
        },
      });
      return tx.appointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CHECKED_IN,
          visitId: visit.id,
        },
        include: {
          patient: {
            select: { id: true, fullName: true, patientCode: true, phone: true },
          },
        },
      });
    });
  }
}
