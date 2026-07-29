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
import { StaffRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayloadUser } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateStaffShiftDto } from './dto/create-staff-shift.dto';
import { QueryStaffShiftDto } from './dto/query-staff-shift.dto';
import { UpdateStaffShiftDto } from './dto/update-staff-shift.dto';
import { StaffShiftService } from './staff-shift.service';

@Roles(StaffRole.ADMIN)
@Controller('staff-shifts')
export class StaffShiftController {
  constructor(private readonly staffShiftService: StaffShiftService) {}

  @Get()
  findAll(@Query() query: QueryStaffShiftDto, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateStaffShiftDto, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffShiftDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.staffShiftService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.staffShiftService.remove(id, user);
  }
}
