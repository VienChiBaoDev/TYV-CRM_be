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
  keepLatestFollowUpPerPatient,
  mapToPendingAssessmentItem,
  mapToScheduleItem,
  startOfTodayUtc,
} from './mappers/follow-up.mapper';
import { ClinicBranch, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { DEFAULT_DAYS_AHEAD } from 'src/common/common';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/common/dto/pagination-query.dto';
import type { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { buildPaginatedMeta, paginateArray } from 'src/common/pagination/paginate';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

const followUpInclude = {
  patient: {
    select: { id: true, fullName: true, patientCode: true },
  },
  originatingVisit: {
    select: { visitNumber: true },
  },
} satisfies Prisma.PatientFollowUpInclude;

@Injectable()
export class PatientFollowUpService {
  constructor(private readonly prisma: PrismaService) {}

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
        followUpDate: {
          gte: today, // Ngày khám >= ngày hôm nay
          lte: endDate, // Ngày khám <= ngày hôm nay + N ngày
        },
        /** Tại cơ sở */
        ...(branch ? { facility: branch } : {}),
      },
      include: followUpInclude,
      orderBy: {
        followUpDate: 'asc',
      },
    });
    const latestPerPatient = keepLatestFollowUpPerPatient(rows);
    const items = latestPerPatient
      .sort((a, b) => a.followUpDate.getTime() - b.followUpDate.getTime())
      .map(mapToScheduleItem);

    return {
      data: paginateArray(items, page, limit),
      meta: buildPaginatedMeta(page, limit, items.length),
    };
  }
  /** Bảng 2: Cần hỏi thăm — đến hạn assessmentDate, chưa có kết quả */
  async findPendingAssessments(params: {
    branch?: ClinicBranch;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<PendingAssessmentItemResponse>> {
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    const rows = await this.prisma.patientFollowUp.findMany({
      where: {
        completedVisitId: null,
        /** Đến hạn assessmentDate */
        assessmentDate: {
          lte: endOfTodayUtc(), // Ngày assessment <= ngày hôm nay
        },
        /** Tại cơ sở */
        ...(params.branch ? { facility: params.branch } : {}),
      },
      include: followUpInclude,
      orderBy: {
        assessmentDate: 'asc',
      },
    });
    // Lấy lịch tái khám gần nhất cho mỗi bệnh nhân
    const latestPerPatient = keepLatestFollowUpPerPatient(rows);
    const items = latestPerPatient
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
    // transaction để đảm bảo tính toàn vẹn dữ liệu
    // Nghĩa là nếu tạo appointment thành công thì mới cập nhật lịch tái khám thành đã đặt lịch
    // Nếu tạo appointment thất bại thì rollback toàn bộ transaction
    // Ngược lại nếu cập nhật lịch tái khám thành đã đặt lịch thành công thì commit transaction
    // Nếu cập nhật lịch tái khám thành đã đặt lịch thất bại thì rollback transaction
    if (followUp.scheduleStatus === 'SCHEDULED') {
      throw new ConflictException('Lịch tái khám đã được đặt lịch');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const scheduledAt = new Date(body.scheduledAt);
      const endedAt = body.endedAt
        ? new Date(body.endedAt)
        : // 30 phút
          new Date(scheduledAt.getTime() + 30 * 60 * 1000);

      if (endedAt <= scheduledAt) {
        throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
      }
      //Dùng transaction — nếu tạo appointment lỗi thì không cập nhật scheduleStatus
      await tx.appointment.create({
        data: {
          patientId: followUp.patientId,
          scheduledAt,
          endedAt,
          doctorName: body.doctorName ?? followUp.physicianInCharge,
          clinicBranch: followUp.facility,
          note: body.note,
        },
      });
      // cập nhật lịch tái khám thành đã đặt lịch
      return tx.patientFollowUp.update({
        where: { id: followUpId },
        data: { scheduleStatus: 'SCHEDULED' },
        include: followUpInclude,
      });
    });

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
