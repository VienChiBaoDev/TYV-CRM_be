import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  StaffRole,
  VisitMode,
  VisitStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaTransactionService } from '../prisma/prisma-transaction.service';
import { PRISMA_TRANSACTION_OPTIONS } from '../prisma/prisma-transaction.options';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  assertAppointmentStatusTransition,
  CHECK_IN_ALLOWED_STATUSES,
} from './appointment-status.rules';
import { formatDateOnly } from '../medical-visit/mappers/visit.mapper';
import { StaffShiftService } from 'src/staff-shift/staff-shift.service';
import { BLOCKING_APPOINTMENT_STATUSES } from './appointment-overlap.rules';

interface FindAppointmentsParams {
  clinicId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  doctorId?: string;
}

interface ResolvedStaffNames {
  doctorName: string;
  assistantName: string | null;
}

interface StaffAssignment extends ResolvedStaffNames {
  doctorId: string;
  assistantId: string | null;
}

interface AssertNoSchedulingConflictParams {
  doctorId: string;
  assistantId?: string | null;
  startAt: Date;
  endAt: Date;
  exceptAppointmentId?: string;
}

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTx: PrismaTransactionService,
    private readonly staffShiftService: StaffShiftService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    this.assertValidTimeRange(dto.scheduledAt, dto.endedAt);
    const startAt = new Date(dto.scheduledAt);
    const endAt = new Date(dto.endedAt);
    const clinicId = dto.clinicId;

    await this.assertAssignedStaffAvailable({
      doctorId: dto.doctorId,
      assistantId: dto.assistantId,
      startAt,
      endAt,
      clinicId,
    });

    await this.assertNoSchedulingConflict({
      doctorId: dto.doctorId,
      assistantId: dto.assistantId,
      startAt,
      endAt,
    });

    const assignment = await this.resolveStaffAssignment(dto.doctorId, dto.assistantId);

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        scheduledAt: startAt,
        endedAt: endAt,
        doctorId: assignment.doctorId,
        assistantId: assignment.assistantId,
        doctorName: assignment.doctorName,
        assistantName: assignment.assistantName,
        clinicId,
        note: dto.note,
      },
    });
  }

  async findAll(params: FindAppointmentsParams) {
    if (params.doctorId) {
      const doctor = await this.prisma.staff.findUnique({
        where: { id: params.doctorId },
        select: { id: true, role: true, isActive: true },
      });
      if (!doctor?.isActive || doctor.role !== StaffRole.DOCTOR) {
        return [];
      }
    }

    const where: Prisma.AppointmentWhereInput = {
      ...(params.clinicId ? { clinicId: params.clinicId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
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
      this.assertValidTimeRange(dto.scheduledAt, dto.endedAt);
    } else if (dto.scheduledAt || dto.endedAt) {
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
    // nếu không phải là hủy lịch hẹn, kiểm tra xem có cần kiểm tra ca làm của nhân viên không và kiểm tra xem có lịch hẹn nào trùng khung giờ với lịch hẹn đang xét không.
    const isCancelling = dto.status === AppointmentStatus.CANCELLED;
    if (!isCancelling && this.shouldValidateStaffShift(dto)) {
      const startAt = new Date(dto.scheduledAt ?? current.scheduledAt);
      const endAt = new Date(dto.endedAt ?? current.endedAt);
      const clinicId = dto.clinicId ?? current.clinicId;
      const doctorId = await this.resolveDoctorId(
        dto.doctorId,
        dto.doctorName ?? current.doctorName,
        current.doctorId,
      );
      const assistantId = await this.resolveOptionalStaffId(
        dto.assistantId,
        dto.assistantName !== undefined ? dto.assistantName : current.assistantName,
        current.assistantId,
      );
      await this.assertAssignedStaffAvailable({
        doctorId,
        assistantId,
        startAt,
        endAt,
        clinicId,
      });
      await this.assertNoSchedulingConflict({
        doctorId,
        assistantId,
        startAt,
        endAt,
        exceptAppointmentId: id,
      });
    }

    const staffAssignment =
      dto.doctorId || dto.assistantId !== undefined || this.shouldValidateStaffShift(dto)
        ? await this.resolveStaffAssignment(
            await this.resolveDoctorId(
              dto.doctorId,
              dto.doctorName ?? current.doctorName,
              current.doctorId,
            ),
            await this.resolveOptionalStaffId(
              dto.assistantId,
              dto.assistantName !== undefined ? dto.assistantName : current.assistantName,
              current.assistantId,
            ),
          )
        : null;

    const staffAssignmentData = staffAssignment
      ? {
          doctorId: staffAssignment.doctorId,
          assistantId: staffAssignment.assistantId,
          doctorName: staffAssignment.doctorName,
          assistantName: staffAssignment.assistantName,
        }
      : dto.assistantName !== undefined
        ? { assistantName: dto.assistantName }
        : {};

    if (isCancelling) {
      return this.prismaTx.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id },
          data: {
            ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
            ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
            ...staffAssignmentData,
            ...(dto.clinicId ? { clinicId: dto.clinicId } : {}),
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
      }, PRISMA_TRANSACTION_OPTIONS);
    }
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
        ...staffAssignmentData,
        ...(dto.clinicId ? { clinicId: dto.clinicId } : {}),
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

  /**
   * Phase 3: chặn 2 lịch BN chồng giờ cùng bác sĩ / trợ lý.
   */
  async assertNoSchedulingConflict(params: AssertNoSchedulingConflictParams): Promise<void> {
    const { doctorId, assistantId, startAt, endAt, exceptAppointmentId } = params;

    await this.assertNoStaffAppointmentOverlap({
      staffId: doctorId,
      field: 'doctorId',
      startAt,
      endAt,
      exceptAppointmentId,
      staffLabel: 'Bác sĩ',
    });

    if (assistantId) {
      await this.assertNoStaffAppointmentOverlap({
        staffId: assistantId,
        field: 'assistantId',
        startAt,
        endAt,
        exceptAppointmentId,
        staffLabel: 'Trợ lý',
      });
    }
  }

  /**
   * Kiểm tra xem có cần kiểm tra ca làm của nhân viên không.
   * Nếu có, trả về true, ngược lại trả về false.
   */
  private shouldValidateStaffShift(dto: UpdateAppointmentDto): boolean {
    return Boolean(
      dto.scheduledAt ||
      dto.endedAt ||
      dto.doctorId ||
      dto.assistantId !== undefined ||
      dto.doctorName !== undefined ||
      dto.assistantName !== undefined ||
      dto.clinicId,
    );
  }
  /**
   * Kiểm tra xem nhân viên được gán có ca làm phù hợp trong khung giờ này không.
   * Nếu không, throw lỗi.
   */
  private async assertAssignedStaffAvailable(params: {
    doctorId: string;
    assistantId?: string | null;
    startAt: Date;
    endAt: Date;
    clinicId: string;
  }): Promise<void> {
    const { doctorId, assistantId, startAt, endAt, clinicId } = params;
    await this.staffShiftService.assertStaffAvailableForAppointment({
      staffId: doctorId,
      startAt,
      endAt,
      clinicId,
      staffLabel: 'Bác sĩ',
    });
    if (assistantId) {
      await this.staffShiftService.assertStaffAvailableForAppointment({
        staffId: assistantId,
        startAt,
        endAt,
        clinicId,
        staffLabel: 'Trợ lý',
      });
    }
  }

  /**
   * Lấy tên của nhân viên được gán.
   * Nếu không có trợ lý, trả về tên của bác sĩ và null cho trợ lý.
   * Nếu không tìm thấy nhân viên, throw lỗi.
   */
  private async resolveStaffAssignment(
    doctorId: string,
    assistantId?: string | null,
  ): Promise<StaffAssignment> {
    const names = await this.resolveStaffNames(doctorId, assistantId);
    return {
      doctorId,
      assistantId: assistantId ?? null,
      doctorName: names.doctorName,
      assistantName: names.assistantName,
    };
  }

  private async resolveStaffNames(
    doctorId: string,
    assistantId?: string | null,
  ): Promise<ResolvedStaffNames> {
    const doctor = await this.prisma.staff.findUnique({
      where: { id: doctorId },
      select: { fullName: true, isActive: true },
    });
    if (!doctor?.isActive) {
      throw new BadRequestException('Không tìm thấy bác sĩ hoặc đã ngừng hoạt động');
    }
    if (!assistantId) {
      return { doctorName: doctor.fullName, assistantName: null };
    }
    const assistant = await this.prisma.staff.findUnique({
      where: { id: assistantId },
      select: { fullName: true, isActive: true },
    });
    if (!assistant?.isActive) {
      throw new BadRequestException('Không tìm thấy trợ lý hoặc đã ngừng hoạt động');
    }
    return {
      doctorName: doctor.fullName,
      assistantName: assistant.fullName,
    };
  }

  /**
   * Lấy id của bác sĩ được gán.
   * Nếu không có id, throw lỗi.
   */
  private async resolveDoctorId(
    doctorId?: string,
    doctorName?: string | null,
    fallbackDoctorId?: string | null,
  ): Promise<string> {
    if (doctorId) return doctorId;
    if (fallbackDoctorId) return fallbackDoctorId;
    if (!doctorName?.trim()) {
      throw new BadRequestException('Vui lòng chọn bác sĩ');
    }
    const staff = await this.prisma.staff.findFirst({
      where: { fullName: doctorName.trim(), isActive: true, role: StaffRole.DOCTOR },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException('Không tìm thấy bác sĩ');
    }
    return staff.id;
  }

  private async resolveOptionalStaffId(
    staffId?: string,
    staffName?: string | null,
    fallbackStaffId?: string | null,
  ): Promise<string | null> {
    if (staffId) return staffId;
    if (fallbackStaffId) return fallbackStaffId;
    if (!staffName?.trim()) return null;
    const staff = await this.prisma.staff.findFirst({
      where: { fullName: staffName.trim(), isActive: true },
      select: { id: true },
    });
    return staff?.id ?? null;
  }

  /**
   * Kiểm tra xem giờ bắt đầu và giờ kết thúc có hợp lệ không.
   * Nếu không, throw lỗi.
   */
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
        clinic: { select: { name: true } },
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
    return this.prismaTx.$transaction(async (tx) => {
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
          location: appointment.clinic.name,
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
    }, PRISMA_TRANSACTION_OPTIONS);
  }
  /**
   * Kiểm tra xem có lịch hẹn nào trùng khung giờ với lịch hẹn đang xét không.
   * Nếu có, throw lỗi.
   * */
  private async assertNoStaffAppointmentOverlap(params: {
    staffId: string;
    field: 'doctorId' | 'assistantId';
    startAt: Date;
    endAt: Date;
    exceptAppointmentId?: string;
    staffLabel: string;
  }): Promise<void> {
    const { staffId, field, startAt, endAt, exceptAppointmentId, staffLabel } = params;

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        [field]: staffId,
        status: { in: [...BLOCKING_APPOINTMENT_STATUSES] },
        ...(exceptAppointmentId ? { id: { not: exceptAppointmentId } } : {}),
        scheduledAt: { lt: endAt },
        endedAt: { gt: startAt },
      },
      select: {
        id: true,
        scheduledAt: true,
        endedAt: true,
        patient: { select: { fullName: true } },
      },
    });

    if (conflict) {
      throw new ConflictException(`${staffLabel} đã có lịch hẹn trong khung giờ này`);
    }
  }
}
