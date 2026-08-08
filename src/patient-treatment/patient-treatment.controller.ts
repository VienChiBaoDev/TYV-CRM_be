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
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/permissions.decorator';
import { UpsertTreatmentSessionDto } from './dto/upsert-treatment-session.dto';
import { PatientTreatmentService } from './patient-treatment.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TreatmentSessionImageResponse } from './mappers/treatment-session.mapper';

@Controller('patients/:patientId')
export class PatientTreatmentController {
  constructor(private readonly patientTreatmentService: PatientTreatmentService) {}

  @Get('treatment-sessions')
  @RequirePermissions(PERMISSIONS.TREATMENT_WRITE)
  findAllByPatient(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientTreatmentService.findAllByPatient(patientId, user);
  }

  @Get('services/:serviceId/treatment-sessions')
  @RequirePermissions(PERMISSIONS.TREATMENT_WRITE)
  findByService(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientTreatmentService.findByService(patientId, serviceId, user);
  }

  @Post('services/:serviceId/treatment-sessions')
  @RequirePermissions(PERMISSIONS.TREATMENT_WRITE)
  upsertSession(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpsertTreatmentSessionDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.patientTreatmentService.upsertSession(patientId, serviceId, dto, user);
  }

  @Post('services/:serviceId/treatment-sessions/:sessionNumber/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @RequirePermissions(PERMISSIONS.TREATMENT_WRITE)
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
      user,
    );
  }

  @Delete('services/:serviceId/treatment-sessions/:sessionNumber/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.TREATMENT_WRITE)
  async deleteSessionImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('sessionNumber', ParseIntPipe) sessionNumber: number,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<void> {
    await this.patientTreatmentService.deleteSessionImage(
      patientId,
      serviceId,
      sessionNumber,
      imageId,
      user,
    );
  }
}
