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
import { CurrentUser } from '../auth/decorators';
import type { JwtPayloadUser } from '../auth/types';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { CreateStaffShiftDto } from './dto/create-staff-shift.dto';
import { QueryStaffShiftDto } from './dto/query-staff-shift.dto';
import { UpdateStaffShiftDto } from './dto/update-staff-shift.dto';
import { StaffShiftService } from './staff-shift.service';

@Controller('staff-shifts')
export class StaffShiftController {
  constructor(private readonly staffShiftService: StaffShiftService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SHIFTS_READ)
  findAll(@Query() query: QueryStaffShiftDto, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.findOne(id, user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SHIFTS_WRITE)
  create(@Body() dto: CreateStaffShiftDto, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffShiftDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.staffShiftService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SHIFTS_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.remove(id, user);
  }
}
