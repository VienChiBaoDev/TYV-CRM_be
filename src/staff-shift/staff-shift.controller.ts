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
  findAll(@Query() query: QueryStaffShiftDto) {
    return this.staffShiftService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffShiftService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateStaffShiftDto) {
    return this.staffShiftService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffShiftDto) {
    return this.staffShiftService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffShiftService.remove(id);
  }
}
