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
import { StaffRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ClinicService } from '../clinic/clinic.service';
import { CreateClinicDto } from './dto/create-clinic.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

/** Quản lý cơ sở / chi nhánh — chỉ ADMIN được thêm/sửa/xóa. */
@Roles(StaffRole.ADMIN)
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  /** Mọi nhân viên đọc danh sách đang bật để chọn trên UI. */
  @Get('options')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.ASSISTANT, StaffRole.STAFF)
  findOptions(@CurrentUser() user: JwtPayloadUser) {
    return this.clinicService.findActiveOptionsForUser(user.id);
  }

  @Get()
  findAll() {
    return this.clinicService.findAll();
  }

  @Post()
  create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicService.remove(id);
  }
}
