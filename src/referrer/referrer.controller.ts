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
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';
import { ReferrerService } from './referrer.service';

@Controller('referrers')
export class ReferrerController {
  constructor(private readonly referrerService: ReferrerService) {}

  @Post()
  create(@Body() dto: CreateReferrerDto) {
    return this.referrerService.create(dto);
  }

  @Get()
  findAll(@Query('search') search?: string) {
    return this.referrerService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.referrerService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferrerDto,
  ) {
    return this.referrerService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.referrerService.remove(id);
  }
}
