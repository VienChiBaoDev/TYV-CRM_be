import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CatalogServiceService } from './catalog-service.service';
import { QueryCatalogServiceDto } from './dto/query-catalog-service.dto';
import { CreateCatalogServiceDto } from './dto/create-catalog-service.dto';
import { UpdateCatalogServiceDto } from './dto/update-catalog-service.dto';

@Controller('catalog-services')
export class CatalogServiceController {
  constructor(private readonly catalogServiceService: CatalogServiceService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CATALOG_READ)
  findAll(@Query() query: QueryCatalogServiceDto) {
    return this.catalogServiceService.findAll(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CATALOG_WRITE)
  create(@Body() dto: CreateCatalogServiceDto) {
    return this.catalogServiceService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CATALOG_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogServiceDto) {
    return this.catalogServiceService.update(id, dto);
  }
}
