import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryCatalogServiceDto } from './dto/query-catalog-service.dto';
import { Prisma } from '@prisma/client';
import { CreateCatalogServiceDto } from './dto/create-catalog-service.dto';
import { UpdateCatalogServiceDto } from './dto/update-catalog-service.dto';

@Injectable()
export class CatalogServiceService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: QueryCatalogServiceDto): Prisma.CatalogServiceWhereInput {
    const where: Prisma.CatalogServiceWhereInput = {};
    if (query.groupId) where.groupId = query.groupId;
    if (query.status) where.status = query.status;
    if (query.unit && query.unit !== 'Tất cả đơn vị') where.unit = query.unit;
    if (query.itemType) where.itemType = query.itemType;

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        // tìm kiếm theo mã hoặc tên
        // không phân biệt hoa thường
        // chứa q
        // mode: 'insensitive' để không phân biệt hoa thường
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  async create(dto: CreateCatalogServiceDto) {
    const exists = await this.prisma.catalogService.findFirst({
      where: { code: dto.code.trim() },
    });
    if (exists) {
      throw new ConflictException('Mã dịch vụ/sản phẩm đã tồn tại');
    }
    return this.prisma.catalogService.create({
      data: dto,
    });
  }

  async findAll(query: QueryCatalogServiceDto) {
    const where = this.buildWhere(query);
    return this.prisma.catalogService.findMany({
      where: where,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const service = await this.prisma.catalogService.findUnique({
      where: { id: id.trim() },
    });
    if (!service) {
      throw new NotFoundException('Dịch vụ/sản phẩm không tồn tại!');
    }
    return service;
  }

  async update(id: string, dto: UpdateCatalogServiceDto) {
    await this.findOne(id);
    return this.prisma.catalogService.update({
      where: { id: id.trim() },
      data: dto,
    });
  }
}
