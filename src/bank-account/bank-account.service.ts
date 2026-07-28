import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

/// Sắp xếp theo thứ tự thủ công trước, rồi mới tới thời điểm tạo.
const ORDER_BY: Prisma.BankAccountOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

@Injectable()
export class BankAccountService {
  constructor(private readonly prisma: PrismaService) {}

  /** Toàn bộ tài khoản, kể cả đã tắt — dùng cho màn Cài đặt. */
  findAll() {
    return this.prisma.bankAccount.findMany({ orderBy: ORDER_BY });
  }

  /** Chỉ tài khoản đang bật — dùng cho ô chọn khi thu / hoàn tiền. */
  findActiveOptions() {
    return this.prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: ORDER_BY,
      select: {
        id: true,
        bankName: true,
        accountHolder: true,
        accountNumber: true,
      },
    });
  }

  async create(dto: CreateBankAccountDto) {
    await this.ensureNotDuplicated(dto.bankName, dto.accountNumber);

    return this.prisma.bankAccount.create({
      data: {
        bankName: dto.bankName.trim(),
        accountHolder: dto.accountHolder.trim(),
        accountNumber: dto.accountNumber.trim(),
        note: dto.note?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    const current = await this.findOne(id);

    const bankName = dto.bankName?.trim() ?? current.bankName;
    const accountNumber = dto.accountNumber?.trim() ?? current.accountNumber;
    if (bankName !== current.bankName || accountNumber !== current.accountNumber) {
      await this.ensureNotDuplicated(bankName, accountNumber, id);
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        bankName,
        accountNumber,
        ...(dto.accountHolder !== undefined && {
          accountHolder: dto.accountHolder.trim(),
        }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * Tài khoản đã phát sinh phiếu thu thì không xóa được — chỉ tắt đi,
   * để lịch sử thanh toán còn tra ngược được về bản ghi gốc.
   */
  async remove(id: string) {
    await this.findOne(id);

    const usedCount = await this.prisma.patientPayment.count({
      where: { bankAccountId: id },
    });

    if (usedCount > 0) {
      return this.prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.bankAccount.delete({ where: { id } });
  }

  private async findOne(id: string) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new NotFoundException('Không tìm thấy tài khoản ngân hàng');
    }
    return account;
  }

  private async ensureNotDuplicated(
    bankName: string,
    accountNumber: string,
    exceptId?: string,
  ) {
    const existing = await this.prisma.bankAccount.findUnique({
      where: {
        bankName_accountNumber: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
        },
      },
      select: { id: true },
    });

    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Số tài khoản này đã tồn tại');
    }
  }
}
