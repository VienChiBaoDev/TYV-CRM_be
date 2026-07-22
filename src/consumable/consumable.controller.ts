import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
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

  /**
   * Lấy danh sách vật tư tiêu hao active
   */
  @Get('options')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.ASSISTANT, StaffRole.STAFF)
  findOptions() {
    return this.consumableService.findActiveOptions();
  }

  @Get('usage')
  findUsage(@Query() query: QueryConsumableUsageDto) {
    return this.consumableService.findUsage(query);
  }

  @Get()
  findAll(@Query() query: QueryConsumableDto) {
    return this.consumableService.findAll(query);
  }

  @Post()
  @Roles(StaffRole.ADMIN)
  create(@Body() dto: CreateConsumableDto) {
    return this.consumableService.create(dto);
  }
  /**
   * Cập nhật vật tư tiêu hao
   */
  @Patch(':id')
  @Roles(StaffRole.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConsumableDto) {
    return this.consumableService.update(id, dto);
  }

  /**
   * Nhập số lượng vật tư tiêu hao
   */
  @Post(':id/stock-in')
  @Roles(StaffRole.ADMIN, StaffRole.STAFF)
  stockIn(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StockInDto) {
    return this.consumableService.stockIn(id, dto);
  }

  /**
   * Điều chỉnh số lượng vật tư tiêu hao
   */
  @Post(':id/stock-adjust')
  @Roles(StaffRole.ADMIN)
  stockAdjust(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StockAdjustDto) {
    return this.consumableService.stockAdjust(id, dto);
  }
}
