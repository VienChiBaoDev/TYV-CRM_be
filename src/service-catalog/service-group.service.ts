import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceGroupDto } from './dto/create-service-group.dto';
import { UpdateServiceGroupDto } from './dto/update-service-group.dto';

@Injectable()
export class ServiceGroupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServiceGroupDto) {
    const exists = await this.prisma.serviceGroup.findUnique({
      where: {
        code: dto.code.trim(),
        // , OR: [{ name: dto.name.trim() }]
      },
    });
    if (exists) {
      throw new ConflictException('Mã nhóm dịch vụ đã tồn tại');
    }
    return this.prisma.serviceGroup.create({
      data: {
        code: dto.code.trim(),
        name: dto.name.trim(),
        itemType: dto.itemType,
      },
    });
  }
  async findAll() {
    return this.prisma.serviceGroup.findMany({
      orderBy: {
        // sắp xếp theo thời gian tạo giảm dần
        createdAt: 'desc',
      },
      // bao gồm số lượng dịch vụ trong nhóm
      include: {
        _count: {
          select: {
            services: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const serviceGroup = await this.prisma.serviceGroup.findUnique({
      where: { id: id.trim() },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
    if (!serviceGroup) {
      throw new NotFoundException('Nhóm dịch vụ không tồn tại');
    }
    return serviceGroup;
  }

  async update(id: string, dto: UpdateServiceGroupDto) {
    await this.findOne(id);
    if (dto.code) {
      const exists = await this.prisma.serviceGroup.findFirst({
        where: { code: dto.code.trim(), NOT: { id: id.trim() } },
      });
      if (exists) {
        throw new ConflictException('Mã nhóm dịch vụ đã tồn tại');
      }
    }
    return this.prisma.serviceGroup.update({
      where: { id: id.trim() },
      data: {
        ...dto,
        code: dto.code?.trim(),
        name: dto.name?.trim(),
      },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }
}
