import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayloadUser } from '../auth/types';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { ClinicService } from '../clinic/clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  /** Dropdown cơ sở — JWT only. */
  @Get('options')
  findOptions(@CurrentUser() user: JwtPayloadUser) {
    return this.clinicService.findActiveOptionsForUser(user.id);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_CLINICS)
  findAll() {
    return this.clinicService.findAll();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_CLINICS)
  create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_CLINICS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_CLINICS)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicService.remove(id);
  }
}
