import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, ClinicBranch, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

interface FindAppointmentsParams {
  branch?: ClinicBranch;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
}

@Injectable()
export class AppointmentService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        scheduledAt: new Date(dto.scheduledAt),
        doctorName: dto.doctorName,
        clinicBranch: dto.clinicBranch,
        note: dto.note,
      },
    });
  }

  findAll(params: FindAppointmentsParams) {
    const where: Prisma.AppointmentWhereInput = {
      ...(params.branch ? { clinicBranch: params.branch } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            scheduledAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };

    return this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, fullName: true, patientCode: true, phone: true },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Không tìm thấy lịch hẹn');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    await this.findOne(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt) } : {}),
        ...(dto.doctorName !== undefined ? { doctorName: dto.doctorName } : {}),
        ...(dto.clinicBranch ? { clinicBranch: dto.clinicBranch } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
        ...(dto.visitId !== undefined ? { visitId: dto.visitId } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appointment.delete({ where: { id } });
  }
}
