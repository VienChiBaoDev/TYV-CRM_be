import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { UpsertTreatmentSessionDto } from './dto/upsert-treatment-session.dto';
import { PatientTreatmentService } from './patient-treatment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TreatmentSessionImageResponse } from './mappers/treatment-session.mapper';

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

  /** Tải ảnh lên buổi điều trị */
  @Post('services/:serviceId/treatment-sessions/:sessionNumber/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadSessionImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<TreatmentSessionImageResponse> {
    return this.patientTreatmentService.uploadSessionImage(
      patientId,
      serviceId,
      sessionNumber,
      file,
      user.id,
    );
  }
  /** Xóa ảnh buổi điều trị */
  @Delete('services/:serviceId/treatment-sessions/:sessionNumber/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSessionImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    await this.patientTreatmentService.deleteSessionImage(
      patientId,
      serviceId,
      sessionNumber,
      imageId,
    );
  }
}
