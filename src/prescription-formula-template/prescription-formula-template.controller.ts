import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators';
import type { JwtPayloadUser } from 'src/auth/types';
import { PERMISSIONS } from 'src/auth/permissions';
import { RequirePermissions } from 'src/auth/decorators';
import { CreatePrescriptionFormulaTemplateDto } from './dto/create-prescription-formula-template.dto';
import { UpdatePrescriptionFormulaTemplateDto } from './dto/update-prescription-formula-template.dto';
import { PrescriptionFormulaTemplateService } from './prescription-formula-template.service';

@Controller('prescription-formula-templates')
export class PrescriptionFormulaTemplateController {
  constructor(private readonly service: PrescriptionFormulaTemplateService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.FORMULAS_READ)
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.service.findAll(user.id);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.FORMULAS_READ)
  findOne(@CurrentUser() user: JwtPayloadUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.FORMULAS_WRITE)
  create(@CurrentUser() user: JwtPayloadUser, @Body() dto: CreatePrescriptionFormulaTemplateDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.FORMULAS_WRITE)
  update(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionFormulaTemplateDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(PERMISSIONS.FORMULAS_WRITE)
  remove(@CurrentUser() user: JwtPayloadUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.id, id);
  }
}
