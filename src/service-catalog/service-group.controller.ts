import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateServiceGroupDto } from './dto/create-service-group.dto';
import { UpdateServiceGroupDto } from './dto/update-service-group.dto';
import { ServiceGroupService } from './service-group.service';

@Controller('service-groups')
export class ServiceGroupController {
  constructor(private readonly serviceGroupService: ServiceGroupService) {}

  @Get()
  findAll() {
    return this.serviceGroupService.findAll();
  }

  @Post()
  create(@Body() dto: CreateServiceGroupDto) {
    return this.serviceGroupService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceGroupDto) {
    return this.serviceGroupService.update(id, dto);
  }
}
