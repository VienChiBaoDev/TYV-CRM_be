import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CreatePatientPaymentDto } from './dto/create-patient-payment.dto';
import {
  PatientPaymentResponse,
  PatientPaymentsListResponse,
} from './mappers/patient-payment.mapper';
import { PatientPaymentService } from './patient-payment.service';
import { CreatePatientRefundDto } from './dto/create-patient-refund.dto';
import { QueryPatientPaymentsDto } from './dto/query-patient-payments.dto';

// thanh toán của một bệnh nhân
@Controller('patients/:patientId/payments')
export class PatientPaymentController {
  constructor(private readonly patientPaymentService: PatientPaymentService) {}

  // tìm tất cả thanh toán của một bệnh nhân
  @Get()
  @RequirePermissions(PERMISSIONS.PAYMENTS_READ)
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryPatientPaymentsDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientPaymentsListResponse> {
    return this.patientPaymentService.findAllByPatient(patientId, query, user);
  }

  // tạo thanh toán mới
  @Post()
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientPaymentDto,
    // lấy thông tin người dùng đã đăng nhập
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    return this.patientPaymentService.create(patientId, dto, user);
  }

  // tạo hoàn trả thanh toán
  @Post('refunds')
  @RequirePermissions(PERMISSIONS.PAYMENTS_WRITE)
  createRefund(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientRefundDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    return this.patientPaymentService.createRefund(patientId, dto, user);
  }
}
