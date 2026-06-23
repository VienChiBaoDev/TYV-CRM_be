import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferrerDto } from './dto/create-referrer.dto';
import { UpdateReferrerDto } from './dto/update-referrer.dto';

@Injectable()
export class ReferrerService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateReferrerDto) {
    return this.prisma.referrer.create({ data: dto });
  }

  findAll(search?: string) {
    const where: Prisma.ReferrerWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }
      : {};

    return this.prisma.referrer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { patients: true } } },
    });
  }

  async findOne(id: string) {
    const referrer = await this.prisma.referrer.findUnique({
      where: { id },
      include: {
        patients: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });

    if (!referrer) {
      throw new NotFoundException('Không tìm thấy người giới thiệu');
    }

    return referrer;
  }

  async update(id: string, dto: UpdateReferrerDto) {
    await this.findOne(id);
    return this.prisma.referrer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.referrer.delete({ where: { id } });
  }
}
