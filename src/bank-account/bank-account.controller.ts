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
import { StaffRole } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

/** Quản lý tài khoản ngân hàng — chỉ ADMIN được thêm/sửa/xóa. */
@Roles(StaffRole.ADMIN)
@Controller('bank-accounts')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  /** Mọi nhân viên đều cần đọc được danh sách để chọn khi thu tiền. */
  @Get('options')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.ASSISTANT, StaffRole.STAFF)
  findOptions() {
    return this.bankAccountService.findActiveOptions();
  }

  @Get()
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.bankAccountService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bankAccountService.remove(id);
  }
}
