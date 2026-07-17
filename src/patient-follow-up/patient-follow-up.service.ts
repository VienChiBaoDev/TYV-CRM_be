import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FollowUpScheduleItemResponse,
  PendingAssessmentItemResponse,
  addDaysUtc,
  endOfTodayUtc,
  mapToPendingAssessmentItem,
  mapToScheduleItem,
  startOfTodayUtc,
} from './mappers/follow-up.mapper';
import { ClinicBranch, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaTransactionService } from 'src/prisma/prisma-transaction.service';
import { PRISMA_TRANSACTION_OPTIONS } from 'src/prisma/prisma-transaction.options';
import { DEFAULT_DAYS_AHEAD } from 'src/common/common';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/common/dto/pagination-query.dto';
import type { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { buildPaginatedMeta, paginateArray } from 'src/common/pagination/paginate';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { RescheduleFollowUpDto } from './dto/reschedule-follow-up.dto';
import { getEffectiveFollowUpDate } from './mappers/follow-up.mapper';
import { parseDateOnly } from 'src/medical-visit/mappers/visit.mapper';
import { StaffShiftService } from 'src/staff-shift/staff-shift.service';

const followUpInclude = {
  patient: {
    select: { id: true, fullName: true, patientCode: true },
  },
} satisfies Prisma.PatientFollowUpInclude;

@Injectable()
export class PatientFollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prismaTx: PrismaTransactionService,
    private readonly staffShiftService: StaffShiftService,
  ) {}

  /** Bảng 1: Sắp đến hạn tái khám trong N ngày tới */
  async findUpcoming(params: {
    branch?: ClinicBranch;
    daysAhead?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<FollowUpScheduleItemResponse>> {
    const branch = params.branch ?? ClinicBranch.HANG_BONG;
    // N ngày tới
    const daysAhead = params.daysAhead ?? DEFAULT_DAYS_AHEAD;
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const today = startOfTodayUtc();
    // Thêm N ngày vào ngày hôm nay
    const endDate = addDaysUtc(today, daysAhead);
    /** Lấy danh sách lịch khám sắp đến hạn trong N ngày tới */
    const rows = await this.prisma.patientFollowUp.findMany({
      where: {
        /** Chưa được khám */
        completedVisitId: null,
        /** Trong N ngày tới */

        OR: [
          // A. Trong cửa sổ N ngày tới
          {
            rescheduledFollowUpDate: {
              not: null,
              gte: today, // Ngày tái khám >= ngày hôm nay
              lte: endDate, // Ngày tái khám <= ngày hôm nay + N ngày
            },
          },
          {
            rescheduledFollowUpDate: null,
            followUpDate: {
              gte: today, // Ngày tái khám >= ngày hôm nay
              lte: endDate, // Ngày tái khám <= ngày hôm nay + N ngày
            },
          },

          // B. Quá hạn + chưa đặt lịch
          {
            scheduleStatus: 'NOT_SCHEDULED',
            rescheduledFollowUpDate: {
              not: null,
              lt: today,
            },
          },
          {
            scheduleStatus: 'NOT_SCHEDULED',
            rescheduledFollowUpDate: null,
            followUpDate: {
              lt: today,
            },
          },
        ],
        /** Tại cơ sở */
        ...(branch ? { facility: branch } : {}),
      },
      include: followUpInclude,
      orderBy: {
        followUpDate: 'asc',
      },
    });
    const items = rows
      .sort((a, b) => getEffectiveFollowUpDate(a).getTime() - getEffectiveFollowUpDate(b).getTime())
      .map(mapToScheduleItem);

    return {
      data: paginateArray(items, page, limit),
      meta: buildPaginatedMeta(page, limit, items.length),
    };
  }
  /** Bảng 2: Hỏi thăm — đến hạn assessmentDate, cùng quy tắc ẩn/hiện với findUpcoming */
  async findPendingAssessments(params: {
    branch?: ClinicBranch;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PendingAssessmentItemResponse>> {
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const today = startOfTodayUtc();
    const rows = await this.prisma.patientFollowUp.findMany({
      where: {
        completedVisitId: null,
        /** Đến hạn assessmentDate */
        assessmentDate: {
          lte: endOfTodayUtc(), // Ngày assessment <= ngày hôm nay
        },
        /** Còn hạn hoặc quá hạn chưa đặt lịch — ẩn khi đã đặt lịch + quá hạn */
        OR: [
          {
            rescheduledFollowUpDate: {
              not: null,
              gte: today,
            },
          },
          {
            rescheduledFollowUpDate: null,
            followUpDate: {
              gte: today,
            },
          },
          {
            scheduleStatus: 'NOT_SCHEDULED',
            rescheduledFollowUpDate: {
              not: null,
              lt: today,
            },
          },
          {
            scheduleStatus: 'NOT_SCHEDULED',
            rescheduledFollowUpDate: null,
            followUpDate: {
              lt: today,
            },
          },
        ],
        /** Tại cơ sở */
        ...(params.branch ? { facility: params.branch } : {}),
      },
      include: followUpInclude,
      orderBy: {
        assessmentDate: 'asc',
      },
    });
    const items = rows
      .sort((a, b) => a.assessmentDate.getTime() - b.assessmentDate.getTime())
      .map(mapToPendingAssessmentItem);

    return {
      data: paginateArray(items, page, limit),
      meta: buildPaginatedMeta(page, limit, items.length),
    };
  }
  //  Nút "Đặt nhanh" — tạo appointment + đánh dấu đã đặt lịch
  async scheduleFollowUp(
    followUpId: string,
    body: ScheduleFollowUpDto,
  ): Promise<FollowUpScheduleItemResponse> {
    const followUp = await this.findFollowUpOrThrow(followUpId);
    if (followUp.scheduleStatus === 'SCHEDULED') {
      throw new ConflictException('Lịch tái khám đã được đặt lịch');
    }

    const scheduledAt = new Date(body.scheduledAt);
    const endedAt = body.endedAt
      ? new Date(body.endedAt)
      : new Date(scheduledAt.getTime() + 30 * 60 * 1000);

    if (endedAt <= scheduledAt) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }

    await this.staffShiftService.assertStaffAvailableForAppointment({
      staffId: body.doctorId,
      startAt: scheduledAt,
      endAt: endedAt,
      branch: followUp.facility,
      staffLabel: 'Bác sĩ',
    });

    if (body.assistantId) {
      await this.staffShiftService.assertStaffAvailableForAppointment({
        staffId: body.assistantId,
        startAt: scheduledAt,
        endAt: endedAt,
        branch: followUp.facility,
        staffLabel: 'Trợ lý',
      });
    }

    const doctor = await this.prisma.staff.findUnique({
      where: { id: body.doctorId },
      select: { fullName: true },
    });
    const assistant = body.assistantId
      ? await this.prisma.staff.findUnique({
          where: { id: body.assistantId },
          select: { fullName: true },
        })
      : null;

    const updated = await this.prismaTx.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patientId: followUp.patientId,
          scheduledAt,
          endedAt,
          doctorName: doctor?.fullName ?? body.doctorName ?? followUp.physicianInCharge,
          assistantName: assistant?.fullName ?? body.assistantName ?? null,
          clinicBranch: followUp.facility,
          note: body.note,
        },
      });
      return tx.patientFollowUp.update({
        where: { id: followUpId },
        data: { scheduleStatus: 'SCHEDULED', scheduledAppointmentId: appointment.id },
        include: followUpInclude,
      });
    }, PRISMA_TRANSACTION_OPTIONS);

    return mapToScheduleItem(updated);
  }

  // Dialog "Hỏi thăm" — ghi kết quả đánh giá
  async submitAssessment(
    followUpId: string,
    body: SubmitAssessmentDto,
  ): Promise<PendingAssessmentItemResponse> {
    await this.findFollowUpOrThrow(followUpId);
    const updated = await this.prisma.patientFollowUp.update({
      where: { id: followUpId },
      data: {
        assessmentResult: body.assessmentResult,
        assessmentNote: body.assessmentNote ?? null,
        assessedAt: new Date(),
      },
      include: followUpInclude,
    });
    return mapToPendingAssessmentItem(updated);
  }

  async rescheduleFollowUp(
    followUpId: string,
    body: RescheduleFollowUpDto,
    rescheduledById: string,
  ): Promise<FollowUpScheduleItemResponse> {
    const followUp = await this.findFollowUpOrThrow(followUpId);

    if (followUp.scheduleStatus === 'SCHEDULED') {
      throw new ConflictException(
        'Đã đặt lịch tái khám. Vui lòng hủy lịch hẹn trên lịch trước khi đổi lịch.',
      );
    }

    const rescheduledFollowUpDate = parseDateOnly(body.rescheduledFollowUpDate);

    const updated = await this.prisma.patientFollowUp.update({
      where: { id: followUpId },
      data: {
        rescheduledFollowUpDate,
        rescheduleNote: body.note?.trim() ?? null,
        rescheduledById,
        rescheduledAt: new Date(),
      },
      // include lịch tái khám đã điều chỉnh
      include: followUpInclude,
    });
    return mapToScheduleItem(updated);
  }

  // Kiểm tra lịch tái khám có tồn tại và chưa hoàn thành khám
  private async findFollowUpOrThrow(id: string) {
    const followUp = await this.prisma.patientFollowUp.findUnique({
      where: { id },
      include: followUpInclude,
    });
    if (!followUp) {
      throw new NotFoundException('Không tìm thấy lịch tái khám');
    }
    if (followUp.completedVisitId) {
      throw new NotFoundException('Lịch tái khám đã hoàn thành');
    }
    return followUp;
  }
}
