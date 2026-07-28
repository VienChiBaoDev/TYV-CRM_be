import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePrescriptionFormulaTemplateDto } from './dto/create-prescription-formula-template.dto';
import { UpdatePrescriptionFormulaTemplateDto } from './dto/update-prescription-formula-template.dto';
import {
  mapTemplateToResponse,
  PrescriptionFormulaTemplateResponse,
} from './mappers/prescription-formula-template.mapper';

const TEMPLATE_INCLUDE = {
  herbs: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.PrescriptionFormulaTemplateInclude;

@Injectable()
export class PrescriptionFormulaTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(staffId: string): Promise<PrescriptionFormulaTemplateResponse[]> {
    const rows = await this.prisma.prescriptionFormulaTemplate.findMany({
      where: { staffId },
      include: TEMPLATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }],
    });

    return rows.map(mapTemplateToResponse);
  }

  async findOne(staffId: string, id: string): Promise<PrescriptionFormulaTemplateResponse> {
    const row = await this.prisma.prescriptionFormulaTemplate.findFirst({
      where: { id, staffId },
      include: TEMPLATE_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException('Không tìm thấy công thức');
    }

    return mapTemplateToResponse(row);
  }

  async create(
    staffId: string,
    dto: CreatePrescriptionFormulaTemplateDto,
  ): Promise<PrescriptionFormulaTemplateResponse> {
    const name = dto.name.trim();
    const dosage = dto.dosage?.trim() || null;

    if (!name) {
      throw new BadRequestException('Tên công thức không được để trống');
    }

    try {
      const created = await this.prisma.prescriptionFormulaTemplate.create({
        data: {
          staffId,
          name,
          dosage,
          herbs: {
            create: dto.herbs.map((herb, index) => ({
              medicineId: herb.medicineId ?? null,
              name: herb.name.trim(),
              weight: herb.weight.trim(),
              unit: herb.unit ?? null,
              quantity: herb.quantity ?? null,
              decoctionOrder: herb.decoctionOrder ?? null,
              decoctionPrep: herb.decoctionPrep ?? null,
              sortOrder: index,
            })),
          },
        },
        include: TEMPLATE_INCLUDE,
      });

      return mapTemplateToResponse(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Bạn đã có công thức trùng tên. Hãy đổi tên hoặc cập nhật công thức cũ.',
        );
      }
      throw error;
    }
  }

  async update(
    staffId: string,
    id: string,
    dto: UpdatePrescriptionFormulaTemplateDto,
  ): Promise<PrescriptionFormulaTemplateResponse> {
    await this.findOne(staffId, id);

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.herbs) {
          await tx.prescriptionFormulaHerb.deleteMany({
            where: { templateId: id },
          });
        }

        return tx.prescriptionFormulaTemplate.update({
          where: { id },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(dto.dosage !== undefined ? { dosage: dto.dosage?.trim() || null } : {}),
            ...(dto.herbs
              ? {
                  herbs: {
                    create: dto.herbs.map((herb, index) => ({
                      medicineId: herb.medicineId ?? null,
                      name: herb.name.trim(),
                      weight: herb.weight.trim(),
                      unit: herb.unit ?? null,
                      quantity: herb.quantity ?? null,
                      decoctionOrder: herb.decoctionOrder ?? null,
                      decoctionPrep: herb.decoctionPrep ?? null,
                      sortOrder: index,
                    })),
                  },
                }
              : {}),
          },
          include: TEMPLATE_INCLUDE,
        });
      });

      return mapTemplateToResponse(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bạn đã có công thức trùng tên');
      }
      throw error;
    }
  }

  async remove(staffId: string, id: string): Promise<void> {
    await this.findOne(staffId, id);
    await this.prisma.prescriptionFormulaTemplate.delete({ where: { id } });
  }
}
