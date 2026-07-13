import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { UpsertTreatmentSessionDto } from './dto/upsert-treatment-session.dto';
import { PatientTreatmentService } from './patient-treatment.service';

@Controller('patients/:patientId')
export class PatientTreatmentController {
  constructor(private readonly patientTreatmentService: PatientTreatmentService) {}

  /** Lịch sử tất cả buổi — cho tab Điều trị (bảng list) */
  @Get('treatment-sessions')
  findAllByPatient(@Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.patientTreatmentService.findAllByPatient(patientId);
  }

  /** Các buổi của 1 dịch vụ — cho TreatmentAction */
  @Get('services/:serviceId/treatment-sessions')
  findByService(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.patientTreatmentService.findByService(patientId, serviceId);
  }

  /** Lưu / sửa buổi */
  @Post('services/:serviceId/treatment-sessions')
  upsertSession(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpsertTreatmentSessionDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientTreatmentService.upsertSession(patientId, serviceId, dto, user.id);
  }
}
