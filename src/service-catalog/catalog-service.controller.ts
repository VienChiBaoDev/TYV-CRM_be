import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CatalogServiceService } from './catalog-service.service';
import { QueryCatalogServiceDto } from './dto/query-catalog-service.dto';
import { CreateCatalogServiceDto } from './dto/create-catalog-service.dto';
import { UpdateCatalogServiceDto } from './dto/update-catalog-service.dto';

@Controller('catalog-services')
export class CatalogServiceController {
  constructor(private readonly catalogServiceService: CatalogServiceService) {}

  @Get()
  findAll(@Query() query: QueryCatalogServiceDto) {
    return this.catalogServiceService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateCatalogServiceDto) {
    return this.catalogServiceService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCatalogServiceDto) {
    return this.catalogServiceService.update(id, dto);
  }
}
