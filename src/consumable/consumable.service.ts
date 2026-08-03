import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from 'src/common/dto/pagination-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { buildPaginatedMeta } from 'src/common/pagination/paginate';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { QueryConsumableUsageDto } from './dto/query-consumable-usage.dto';
import { QueryConsumableDto } from './dto/query-consumable.dto';
import { StockAdjustDto } from './dto/stock-adjust.dto';
import { StockInDto } from './dto/stock-in.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
import {
  ConsumableUsageResponse,
  mapConsumableToOption,
  mapConsumableToResponse,
} from './mappers/consumable.mapper';

/**
 * Order by cho danh sách vật tư tiêu hao
 */
const ORDER_BY: Prisma.ConsumableOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { name: 'asc' },
];

@Injectable()
export class ConsumableService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xây dựng where cho query danh sách vật tư tiêu hao
   */
  private buildWhere(query: QueryConsumableDto): Prisma.ConsumableWhereInput {
    const where: Prisma.ConsumableWhereInput = {};
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async create(dto: CreateConsumableDto) {
    const name = dto.name.trim();
    const unit = dto.unit.trim();

    const exists = await this.prisma.consumable.findFirst({ where: { name, unit } });
    if (exists) throw new BadRequestException('Vật tư đã tồn tại');

    const created = await this.prisma.consumable.create({
      data: {
        name,
        unit,
        stockQuantity: dto.stockQuantity ?? 0,
        note: dto.note?.trim() || null,
        sessionQuotaText: dto.sessionQuotaText?.trim() || null,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return mapConsumableToResponse(created);
  }

  async findAll(query: QueryConsumableDto) {
    const rows = await this.prisma.consumable.findMany({
      where: this.buildWhere(query),
      orderBy: ORDER_BY,
    });
    return rows.map(mapConsumableToResponse);
  }

  /**
   * Lấy danh sách vật tư tiêu hao active
   */
  async findActiveOptions() {
    return this.prisma.consumable
      .findMany({ where: { isActive: true }, orderBy: ORDER_BY })
      .then((rows) => rows.map(mapConsumableToOption));
  }

  async findOne(id: string) {
    const row = await this.prisma.consumable.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy vật tư');
    return mapConsumableToResponse(row);
  }

  async update(id: string, dto: UpdateConsumableDto) {
    await this.findOne(id);

    const updated = await this.prisma.consumable.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.unit !== undefined && { unit: dto.unit.trim() }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
        ...(dto.sessionQuotaText !== undefined && {
          sessionQuotaText: dto.sessionQuotaText?.trim() || null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return mapConsumableToResponse(updated);
  }

  /** Nhập kho — cộng thẳng vào stockQuantity */
  async stockIn(id: string, dto: StockInDto) {
    /**
     * Kiểm tra vật tư có tồn tại không
     */
    const current = await this.prisma.consumable.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy vật tư');

    /**
     * Cập nhật số lượng vật tư tiêu hao
     */
    const updated = await this.prisma.consumable.update({
      where: { id },
      data: {
        stockQuantity: Number(current.stockQuantity) + dto.quantity,
      },
    });

    return mapConsumableToResponse(updated);
  }

  /** Kiểm kê — set tồn về số thực tế */
  async stockAdjust(id: string, dto: StockAdjustDto) {
    const current = await this.prisma.consumable.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy vật tư');

    /**
     * Cập nhật số lượng vật tư tiêu hao
     */
    const updated = await this.prisma.consumable.update({
      where: { id },
      data: { stockQuantity: dto.newQuantity },
    });

    return mapConsumableToResponse(updated);
  }

  /** Báo cáo tiêu hao — query từ TreatmentSessionConsumable */
  /**
   * Lấy báo cáo tiêu hao
   */
  async findUsage(
    query: QueryConsumableUsageDto,
  ): Promise<PaginatedResponse<ConsumableUsageResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const and: Prisma.TreatmentSessionConsumableWhereInput[] = [];

    if (query.consumableId) {
      and.push({ consumableId: query.consumableId });
    }

    if (query.from || query.to) {
      const performedAt: Prisma.DateTimeFilter = {};
      if (query.from) performedAt.gte = new Date(query.from);
      if (query.to) performedAt.lte = new Date(query.to);
      and.push({ session: { performedAt } });
    }

    const search = query.search?.trim();
    if (search) {
      and.push({
        OR: [
          { nameSnapshot: { contains: search, mode: 'insensitive' } },
          {
            session: {
              patientServiceRecord: {
                patient: { fullName: { contains: search, mode: 'insensitive' } },
              },
            },
          },
          {
            session: {
              patientServiceRecord: {
                patient: { patientCode: { contains: search, mode: 'insensitive' } },
              },
            },
          },
          {
            session: {
              patientServiceRecord: {
                serviceName: { contains: search, mode: 'insensitive' },
              },
            },
          },
          {
            session: {
              performedBy: { fullName: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    const where: Prisma.TreatmentSessionConsumableWhereInput =
      and.length > 0 ? { AND: and } : {};

    const [rows, total] = await Promise.all([
      // Lấy danh sách tiêu hao
      this.prisma.treatmentSessionConsumable.findMany({
        where,
        include: {
          session: {
            include: {
              patientServiceRecord: {
                include: {
                  patient: { select: { fullName: true, patientCode: true } },
                },
              },
              performedBy: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      // Lấy tổng số lượng tiêu hao
      this.prisma.treatmentSessionConsumable.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        consumableName: row.nameSnapshot,
        unit: row.unitSnapshot,
        quantity: Number(row.quantity),
        performedAt: row.session.performedAt.toISOString(),
        patientName: row.session.patientServiceRecord.patient.fullName,
        patientCode: row.session.patientServiceRecord.patient.patientCode,
        serviceName: row.session.patientServiceRecord.serviceName,
        sessionNumber: row.session.sessionNumber,
        performedByName: row.session.performedBy?.fullName ?? null,
      })),
      meta: buildPaginatedMeta(page, limit, total),
    };
  }
}
