import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PERMISSIONS } from '../auth/permissions';
import { RequirePermissions } from '../auth/decorators';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  /** Dropdown khi thu tiền — JWT only. */
  @Get('options')
  findOptions() {
    return this.bankAccountService.findActiveOptions();
  }

  @Get()
  @RequirePermissions(PERMISSIONS.SETTINGS_BANKS)
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SETTINGS_BANKS)
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_BANKS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.bankAccountService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SETTINGS_BANKS)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.remove(id);
  }
}
