import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/common/dto/pagination-query.dto';
import type { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from 'src/common/pagination/paginate';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import {
  mapMedicineToResponse,
  MedicineResponse,
  normalizeCategory,
} from './mappers/medicine.mapper';

@Injectable()
export class MedicineService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryMedicineDto): Prisma.MedicineWhereInput {
    const where: Prisma.MedicineWhereInput = {};

    if (query.unit && query.unit !== 'Tất cả đơn vị') {
      where.unit = query.unit;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        // insensitive là phương thức để tìm kiếm không phân biệt chữ hoa thường
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async create(dto: CreateMedicineDto): Promise<MedicineResponse> {
    const existing = await this.prisma.medicine.findFirst({
      where: { name: dto.name.trim(), unit: dto.unit.trim() },
    });

    if (existing) {
      throw new BadRequestException('Thuốc đã tồn tại trong kho thuốc');
    }

    const created = await this.prisma.medicine.create({
      data: {
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        unitPrice: dto.unitPrice,
        category: normalizeCategory(dto.category),
      },
    });

    return mapMedicineToResponse(created);
  }

  async findAll(query: QueryMedicineDto): Promise<PaginatedResponse<MedicineResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const where = this.buildWhere(query);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.medicine.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.medicine.count({ where }),
    ]);

    return {
      data: rows.map(mapMedicineToResponse),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<MedicineResponse> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
    });

    if (!medicine) {
      throw new NotFoundException('Không tìm thấy thuốc');
    }

    return mapMedicineToResponse(medicine);
  }

  async update(id: string, dto: UpdateMedicineDto): Promise<MedicineResponse> {
    await this.findOne(id);

    const updated = await this.prisma.medicine.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.category !== undefined ? { category: normalizeCategory(dto.category) } : {}),
      },
    });

    return mapMedicineToResponse(updated);
  }
}
