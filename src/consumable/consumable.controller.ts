import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { ConsumableService } from './consumable.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
import { QueryConsumableDto } from './dto/query-consumable.dto';
import { StockInDto } from './dto/stock-in.dto';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { QueryConsumableUsageDto } from './dto/query-consumable-usage.dto';

@Controller('consumables')
export class ConsumableController {
  constructor(private readonly consumableService: ConsumableService) {}

  @Get('options')
  @RequirePermissions(PERMISSIONS.CONSUMABLES_READ)
  findOptions() {
    return this.consumableService.findActiveOptions();
  }

  @Get('usage')
  @RequirePermissions(PERMISSIONS.CONSUMABLES_READ)
  findUsage(@Query() query: QueryConsumableUsageDto) {
    return this.consumableService.findUsage(query);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CONSUMABLES_READ)
  findAll(@Query() query: QueryConsumableDto) {
    return this.consumableService.findAll(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CONSUMABLES_WRITE)
  create(@Body() dto: CreateConsumableDto) {
    return this.consumableService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CONSUMABLES_WRITE)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConsumableDto) {
    return this.consumableService.update(id, dto);
  }

  @Post(':id/stock-in')
  @RequirePermissions(PERMISSIONS.CONSUMABLES_WRITE)
  stockIn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StockInDto) {
    return this.consumableService.stockIn(id, dto);
  }

  @Post(':id/stock-adjust')
  @RequirePermissions(PERMISSIONS.CONSUMABLES_WRITE)
  stockAdjust(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StockAdjustDto) {
    return this.consumableService.stockAdjust(id, dto);
  }
}
