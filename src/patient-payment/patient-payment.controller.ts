import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
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
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: QueryPatientPaymentsDto,
  ): Promise<PatientPaymentsListResponse> {
    return this.patientPaymentService.findAllByPatient(patientId, query);
  }

  // tạo thanh toán mới
  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientPaymentDto,
    // lấy thông tin người dùng đã đăng nhập
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    return this.patientPaymentService.create(patientId, dto, user.id);
  }

  // tạo hoàn trả thanh toán
  @Post('refunds')
  createRefund(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientRefundDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientPaymentResponse> {
    return this.patientPaymentService.createRefund(patientId, dto, user.id);
  }
}
