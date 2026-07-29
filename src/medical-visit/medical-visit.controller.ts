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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { CreateMedicalVisitDto } from './dto/create-medical-visit.dto';
import { UpdateMedicalVisitDto } from './dto/update-medical-visit.dto';
import { UploadClinicalImageDto } from './dto/upload-clinical-image.dto';
import {
  MedicalVisitResponse,
  VisitClinicalImageResponse,
} from './mappers/visit.mapper';
import { MedicalVisitService } from './medical-visit.service';

@Controller('patients/:patientId/visits')
export class MedicalVisitController {
  constructor(private readonly medicalVisitService: MedicalVisitService) {}

  @Get()
  findAll(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalVisitResponse[]> {
    return this.medicalVisitService.findAllByPatient(patientId, user);
  }

  @Get(':visitId')
  findOne(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.findOne(patientId, visitId, user);
  }

  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicalVisitDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.create(patientId, dto, user);
  }

  @Patch(':visitId')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateMedicalVisitDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.update(patientId, visitId, dto, user);
  }

  @Post(':visitId/clinical-images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadClinicalImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadClinicalImageDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<VisitClinicalImageResponse> {
    return this.medicalVisitService.uploadClinicalImage(
      patientId,
      visitId,
      file,
      dto.category,
      user,
    );
  }

  @Delete(':visitId/clinical-images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClinicalImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<void> {
    await this.medicalVisitService.deleteClinicalImage(
      patientId,
      visitId,
      imageId,
      user,
    );
  }

  @Delete(':visitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<void> {
    await this.medicalVisitService.remove(patientId, visitId, user);
  }
}
