import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Staff, StaffRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { PermissionCode } from './permissions';
import { PermissionsService } from './permissions.service';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Staff['role'];
  clinicIds: string[];
  allClinics: boolean;
  permissions: PermissionCode[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; user: AuthUser }> {
    const staff = await this.prisma.staff.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const valid = await compare(dto.password, staff.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const user = await this.toAuthUser(staff);
    const accessToken = await this.issueAccessToken(user);

    return { accessToken, user };
  }

  async me(userId: string): Promise<AuthUser> {
    const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }
    return this.toAuthUser(staff);
  }

  issueAccessToken(user: AuthUser): Promise<string> {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      permissions: user.permissions,
    });
  }

  /**
   * Chuyển đổi nhân viên thành đối tượng AuthUser
   * @param staff là nhân viên
   * @returns là một đối tượng AuthUser
   */
  private async toAuthUser(staff: Staff): Promise<AuthUser> {
    const allClinics = staff.role === StaffRole.ADMIN;
    const clinicIds = allClinics
      ? []
      : (
          await this.prisma.staffClinic.findMany({
            where: { staffId: staff.id },
            select: { clinicId: true },
          })
        ).map((row) => row.clinicId);

    const permissions = await this.permissionsService.getForStaff(staff.id, staff.role);

    return {
      id: staff.id,
      email: staff.email,
      fullName: staff.fullName,
      role: staff.role,
      clinicIds,
      allClinics,
      permissions,
    };
  }
}
