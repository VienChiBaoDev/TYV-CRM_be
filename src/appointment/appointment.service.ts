import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  ClinicBranch,
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

// record để mapping branch với location
const BRANCH_TO_LOCATION: Record<ClinicBranch, string> = {
  [ClinicBranch.HANG_BONG]: 'Hàng Bông',
  [ClinicBranch.CAU_GIAY]: 'Cầu Giấy',
};

const DEFAULT_BRANCH = ClinicBranch.HANG_BONG;

interface FindAppointmentsParams {
  branch?: ClinicBranch;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  doctorId?: string;
}

interface ResolvedStaffNames {
  doctorName: string;
  assistantName: string | null;
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
    const branch = dto.clinicBranch ?? DEFAULT_BRANCH;

    await this.assertAssignedStaffAvailable({
      doctorId: dto.doctorId,
      assistantId: dto.assistantId,
      startAt,
      endAt,
      branch,
    });

    const names = await this.resolveStaffNames(dto.doctorId, dto.assistantId);

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        scheduledAt: startAt,
        endedAt: endAt,
        doctorName: names.doctorName,
        assistantName: names.assistantName,
        clinicBranch: branch,
        note: dto.note,
      },
    });
  }

  async findAll(params: FindAppointmentsParams) {
    const doctorName = params.doctorId
      ? await this.resolveDoctorFilterName(params.doctorId)
      : undefined;

    if (params.doctorId && !doctorName) {
      return [];
    }

    const where: Prisma.AppointmentWhereInput = {
      ...(params.branch ? { clinicBranch: params.branch } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(doctorName ? { doctorName } : {}),
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
    // nếu không phải là hủy lịch hẹn, kiểm tra xem có cần kiểm tra ca làm của nhân viên không.
    const isCancelling = dto.status === AppointmentStatus.CANCELLED;
    if (!isCancelling && this.shouldValidateStaffShift(dto)) {
      // nếu cần kiểm tra ca làm của nhân viên, lấy giờ bắt đầu và giờ kết thúc từ dto hoặc từ lịch hẹn hiện tại.
      const startAt = new Date(dto.scheduledAt ?? current.scheduledAt);
      const endAt = new Date(dto.endedAt ?? current.endedAt);
      const branch = dto.clinicBranch ?? current.clinicBranch;
      // lấy id của bác sĩ được gán từ dto hoặc từ lịch hẹn hiện tại.
      const doctorId = await this.resolveDoctorId(
        dto.doctorId,
        dto.doctorName ?? current.doctorName,
      );
      // lấy id của trợ lý được gán từ dto hoặc từ lịch hẹn hiện tại.
      const assistantId = await this.resolveOptionalStaffId(
        dto.assistantId,
        dto.assistantName !== undefined ? dto.assistantName : current.assistantName,
      );
      // kiểm tra xem ca làm của nhân viên có phù hợp không.
      await this.assertAssignedStaffAvailable({
        doctorId,
        assistantId,
        startAt,
        endAt,
        branch,
      });
    }
    // lấy tên của nhân viên được gán từ dto hoặc từ lịch hẹn hiện tại.
    const resolvedNames =
      dto.doctorId || dto.assistantId !== undefined
        ? // nếu có id của bác sĩ hoặc trợ lý được gán từ dto, lấy tên của nhân viên được gán.s
          await this.resolveStaffNames(
            // lấy id của bác sĩ được gán từ dto hoặc từ lịch hẹn hiện tại.
            await this.resolveDoctorId(dto.doctorId, dto.doctorName ?? current.doctorName),
            // lấy id của trợ lý được gán từ dto hoặc từ lịch hẹn hiện tại.
            await this.resolveOptionalStaffId(
              dto.assistantId,
              dto.assistantName !== undefined ? dto.assistantName : current.assistantName,
            ),
          )
        : null;
    // nếu là hủy lịch hẹn, cập nhật trạng thái lịch hẹn thành CANCELLED.
    if (isCancelling) {
      return this.prismaTx.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          // cập nhật trạng thái lịch hẹn thành CANCELLED.
          where: { id },
          data: {
            ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
            ...(dto.endedAt ? { endedAt: new Date(dto.endedAt) } : {}),
            ...(resolvedNames ? { doctorName: resolvedNames.doctorName } : {}),
            ...(resolvedNames
              ? { assistantName: resolvedNames.assistantName }
              : dto.assistantName !== undefined
                ? { assistantName: dto.assistantName }
                : {}),
            ...(dto.clinicBranch ? { clinicBranch: dto.clinicBranch } : {}),
            // cập nhật trạng thái lịch hẹn thành CANCELLED.
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
        ...(resolvedNames ? { doctorName: resolvedNames.doctorName } : {}),
        ...(resolvedNames
          ? { assistantName: resolvedNames.assistantName }
          : dto.assistantName !== undefined
            ? { assistantName: dto.assistantName }
            : {}),
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
      dto.clinicBranch,
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
    branch: ClinicBranch;
  }): Promise<void> {
    const { doctorId, assistantId, startAt, endAt, branch } = params;
    await this.staffShiftService.assertStaffAvailableForAppointment({
      staffId: doctorId,
      startAt,
      endAt,
      branch,
      staffLabel: 'Bác sĩ',
    });
    if (assistantId) {
      await this.staffShiftService.assertStaffAvailableForAppointment({
        staffId: assistantId,
        startAt,
        endAt,
        branch,
        staffLabel: 'Trợ lý',
      });
    }
  }

  /**
   * Lấy tên bác sĩ để lọc danh sách lịch hẹn. Trả về null nếu không hợp lệ.
   */
  private async resolveDoctorFilterName(doctorId: string): Promise<string | null> {
    const doctor = await this.prisma.staff.findUnique({
      where: { id: doctorId },
      select: { fullName: true, role: true, isActive: true },
    });
    if (!doctor?.isActive || doctor.role !== StaffRole.DOCTOR) {
      return null;
    }
    return doctor.fullName;
  }

  /**
   * Lấy tên của nhân viên được gán.
   * Nếu không có trợ lý, trả về tên của bác sĩ và null cho trợ lý.
   * Nếu không tìm thấy nhân viên, throw lỗi.
   */
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
  private async resolveDoctorId(doctorId?: string, doctorName?: string | null): Promise<string> {
    if (doctorId) return doctorId;
    if (!doctorName?.trim()) {
      throw new BadRequestException('Vui lòng chọn bác sĩ');
    }
    const staff = await this.prisma.staff.findFirst({
      where: { fullName: doctorName.trim(), isActive: true },
      select: { id: true },
    });
    if (!staff) {
      throw new BadRequestException('Không tìm thấy bác sĩ');
    }
    return staff.id;
  }

  /**
   * Lấy id của nhân viên được gán.
   * Nếu không có id, trả về null.
   * Nếu không tìm thấy nhân viên, throw lỗi.
   */
  private async resolveOptionalStaffId(
    staffId?: string,
    staffName?: string | null,
  ): Promise<string | null> {
    if (staffId) return staffId;
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
    }, PRISMA_TRANSACTION_OPTIONS);
  }
}
