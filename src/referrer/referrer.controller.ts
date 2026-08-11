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
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { ReferrerService } from './referrer.service';

@Controller('referrers')
export class ReferrerController {
  constructor(private readonly referrerService: ReferrerService) {}

  @Post()
  @RequirePermissions(PERMISSIONS.REFERRERS_WRITE)
  create(@Body() dto: CreateReferrerDto) {
    return this.referrerService.create(dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findAll(@Query('search') search?: string) {
    return this.referrerService.findAll(search);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PATIENTS_READ)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referrerService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.REFERRERS_WRITE)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferrerDto,
  ) {
    return this.referrerService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.REFERRERS_WRITE)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referrerService.remove(id);
  }
}
