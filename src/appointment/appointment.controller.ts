import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayloadUser } from '../auth/types';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_WRITE)
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: JwtPayloadUser) {
    return this.appointmentService.create(dto, user);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  findAll(
    @CurrentUser() user: JwtPayloadUser,
    @Query('clinicId') clinicId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.appointmentService.findAll({ clinicId, status, from, to, doctorId }, user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.appointmentService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.appointmentService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.appointmentService.remove(id, user);
  }

  @Post(':id/check-in')
  @RequirePermissions(PERMISSIONS.APPOINTMENTS_WRITE)
  checkIn(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.appointmentService.checkIn(id, user);
  }
}
