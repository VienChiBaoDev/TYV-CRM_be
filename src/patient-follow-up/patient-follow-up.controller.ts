import { Controller, Get, Body, Patch, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { PatientFollowUpService } from './patient-follow-up.service';
import { QueryUpcomingFollowUpsDto } from './dto/query-upcoming-follow-ups.dto';
import {
  FollowUpScheduleItemResponse,
  PendingAssessmentItemResponse,
} from './mappers/follow-up.mapper';
import { QueryPendingAssessmentsDto } from './dto/query-pending-assessments.dto';
import type { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { RescheduleFollowUpDto } from './dto/reschedule-follow-up.dto';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { JwtPayloadUser } from 'src/auth/jwt-auth.guard';
import { PERMISSIONS } from 'src/auth/permissions';
import { RequirePermissions } from 'src/auth/permissions.decorator';

@Controller('follow-ups')
export class PatientFollowUpController {
  constructor(private readonly patientFollowUpService: PatientFollowUpService) {}

  @Get('upcoming')
  @RequirePermissions(PERMISSIONS.FOLLOWUPS_WRITE)
  findUpcoming(
    @Query() query: QueryUpcomingFollowUpsDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PaginatedResponse<FollowUpScheduleItemResponse>> {
    return this.patientFollowUpService.findUpcoming(
      {
        clinicId: query.clinicId,
        daysAhead: query.daysAhead,
        page: query.page,
        limit: query.limit,
      },
      user,
    );
  }

  @Get('pending-assessment')
  @RequirePermissions(PERMISSIONS.FOLLOWUPS_WRITE)
  findPendingAssessments(
    @Query() query: QueryPendingAssessmentsDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PaginatedResponse<PendingAssessmentItemResponse>> {
    return this.patientFollowUpService.findPendingAssessments(
      {
        clinicId: query.clinicId,
        page: query.page,
        limit: query.limit,
      },
      user,
    );
  }

  @Patch(':id/schedule')
  @RequirePermissions(PERMISSIONS.FOLLOWUPS_WRITE)
  scheduleFollowUp(
    @Param('id') id: string,
    @Body() body: ScheduleFollowUpDto,
  ): Promise<FollowUpScheduleItemResponse> {
    return this.patientFollowUpService.scheduleFollowUp(id, body);
  }

  @Patch(':id/assessment')
  @RequirePermissions(PERMISSIONS.FOLLOWUPS_WRITE)
  submitAssessment(
    @Param('id') id: string,
    @Body() body: SubmitAssessmentDto,
  ): Promise<PendingAssessmentItemResponse> {
    return this.patientFollowUpService.submitAssessment(id, body);
  }

  @Patch(':id/reschedule')
  @RequirePermissions(PERMISSIONS.FOLLOWUPS_WRITE)
  rescheduleFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleFollowUpDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<FollowUpScheduleItemResponse> {
    return this.patientFollowUpService.rescheduleFollowUp(id, body, user.id);
  }
}
