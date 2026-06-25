import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PatientFollowUpService } from './patient-follow-up.service';
import { QueryUpcomingFollowUpsDto } from './dto/query-upcoming-follow-ups.dto';
import {
  FollowUpScheduleItemResponse,
  PendingAssessmentItemResponse,
} from './mappers/follow-up.mapper';
import { QueryPendingAssessmentsDto } from './dto/query-pending-assessments.dto';
import { ScheduleFollowUpDto } from './dto/schedule-follow-up.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';

@Controller('follow-ups')
export class PatientFollowUpController {
  constructor(private readonly patientFollowUpService: PatientFollowUpService) {}

  @Get('upcoming')
  findUpcoming(@Query() query: QueryUpcomingFollowUpsDto): Promise<FollowUpScheduleItemResponse[]> {
    return this.patientFollowUpService.findUpcoming({
      branch: query.branch,
      daysAhead: query.daysAhead,
    });
  }

  @Get('pending-assessment')
  findPendingAssessments(
    @Query() query: QueryPendingAssessmentsDto,
  ): Promise<PendingAssessmentItemResponse[]> {
    return this.patientFollowUpService.findPendingAssessments({
      branch: query.branch,
    });
  }

  @Patch(':id/schedule')
  scheduleFollowUp(
    @Param('id') id: string,
    @Body() body: ScheduleFollowUpDto,
  ): Promise<FollowUpScheduleItemResponse> {
    return this.patientFollowUpService.scheduleFollowUp(id, body);
  }

  @Patch(':id/assessment')
  submitAssessment(
    @Param('id') id: string,
    @Body() body: SubmitAssessmentDto,
  ): Promise<PendingAssessmentItemResponse> {
    return this.patientFollowUpService.submitAssessment(id, body);
  }
}
