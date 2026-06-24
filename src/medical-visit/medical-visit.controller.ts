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
  ): Promise<MedicalVisitResponse[]> {
    return this.medicalVisitService.findAllByPatient(patientId);
  }

  @Get(':visitId')
  findOne(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.findOne(patientId, visitId);
  }

  @Post()
  create(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.create(patientId, dto);
  }

  @Patch(':visitId')
  update(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdateMedicalVisitDto,
  ): Promise<MedicalVisitResponse> {
    return this.medicalVisitService.update(patientId, visitId, dto);
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
  ): Promise<VisitClinicalImageResponse> {
    return this.medicalVisitService.uploadClinicalImage(
      patientId,
      visitId,
      file,
      dto.category,
    );
  }

  @Delete(':visitId/clinical-images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClinicalImage(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ): Promise<void> {
    await this.medicalVisitService.deleteClinicalImage(
      patientId,
      visitId,
      imageId,
    );
  }

  @Delete(':visitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('visitId', ParseUUIDPipe) visitId: string,
  ): Promise<void> {
    await this.medicalVisitService.remove(patientId, visitId);
  }
}
