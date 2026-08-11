import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { CreateServiceGroupDto } from './dto/create-service-group.dto';
import { UpdateServiceGroupDto } from './dto/update-service-group.dto';
import { ServiceGroupService } from './service-group.service';

@Controller('service-groups')
export class ServiceGroupController {
  constructor(private readonly serviceGroupService: ServiceGroupService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CATALOG_READ)
  findAll() {
    return this.serviceGroupService.findAll();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CATALOG_WRITE)
  create(@Body() dto: CreateServiceGroupDto) {
    return this.serviceGroupService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CATALOG_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceGroupDto) {
    return this.serviceGroupService.update(id, dto);
  }
}
