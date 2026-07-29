import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Staff } from '@prisma/client';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Staff['role'];
  clinicId: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

    const user = this.toAuthUser(staff);
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      clinicId: user.clinicId,
    });

    return { accessToken, user };
  }

  async me(userId: string): Promise<AuthUser> {
    const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }
    return this.toAuthUser(staff);
  }

  private toAuthUser(staff: Staff): AuthUser {
    return {
      id: staff.id,
      email: staff.email,
      fullName: staff.fullName,
      role: staff.role,
      clinicId: staff.clinicId,
    };
  }
}
