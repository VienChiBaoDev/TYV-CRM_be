import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { CreatePatientServiceDto } from './dto/create-patient-service.dto';
import { PatientServiceResponse } from './mappers/patient-service.mapper';
import { PatientServiceService } from './patient-service.service';
import { UpdatePatientServiceDto } from './dto/update-patient-service.dto';

@Controller('patients/:patientId/services')
export class PatientServiceController {
  constructor(private readonly patientServiceService: PatientServiceService) {}
  // Lấy danh sách dịch vụ của bệnh nhân
  @Get()
  findAll(@Param('patientId', ParseUUIDPipe) patientId: string): Promise<PatientServiceResponse[]> {
    return this.patientServiceService.findAllByPatient(patientId);
  }
  // Tạo dịch vụ cho bệnh nhân
  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientServiceDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.create(patientId, dto, user.id);
  }

  // Xóa dịch vụ của bệnh nhân
  @Delete(':serviceId')
  // http code 204 là không có nội dung
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<void> {
    return this.patientServiceService.delete(patientId, serviceId);
  }

  // Hủy dịch vụ (soft delete — giữ lịch sử phiếu thanh toán)
  @Patch(':serviceId/cancel')
  cancel(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.cancel(patientId, serviceId, user.id);
  }

  // Cập nhật dịch vụ của bệnh nhân
  @Patch(':serviceId')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdatePatientServiceDto,
    // Khi nào có trường người cập nhập cuối cùng ở bảng patient_service_record thì sử dụng @CurrentUser() user: JwtPayloadUser
    // @CurrentUser() user: JwtPayloadUser,
  ): Promise<PatientServiceResponse> {
    return this.patientServiceService.update(patientId, serviceId, dto);
  }
}
