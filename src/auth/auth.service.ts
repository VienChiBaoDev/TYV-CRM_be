import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Staff, StaffRole } from '@prisma/client';
import { compare } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { PermissionsService } from './permissions.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import type { AuthUser } from './types';

export type { AuthUser } from './types';

type StaffAuthRow = Pick<Staff, 'id' | 'email' | 'fullName' | 'role' | 'isActive' | 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissionsService: PermissionsService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
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

    return this.issueTokens(staff);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      !stored.staff.isActive
    ) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Rotate: revoke refresh cũ rồi phát cặp token mới (SHA-256 hash trong DB).
    const [, tokens] = await Promise.all([
      this.refreshTokens.revokeById(stored.id),
      this.issueTokens(stored.staff),
    ]);

    return tokens;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.refreshTokens.revokeByHash(this.hashToken(refreshToken));
  }

  async me(userId: string): Promise<AuthUser> {
    const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
    if (!staff || !staff.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }
    return this.toAuthUser(staff);
  }

  private async issueTokens(
    staff: StaffAuthRow,
  ): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const user = await this.toAuthUser(staff);
    const accessExpires = this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m';
    // Raw refresh chỉ gửi qua cookie; DB chỉ lưu SHA-256.
    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = this.parseDays(this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d');

    const [accessToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          permissions: user.permissions,
        },
        {
          secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
          expiresIn: accessExpires as `${number}m` | `${number}d` | `${number}h`,
        },
      ),
      this.refreshTokens.create({
        staffId: staff.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      }),
    ]);

    void this.refreshTokens.cleanupForStaff(staff.id).catch(() => undefined);

    return { accessToken, refreshToken, user };
  }

  /** SHA-256 — giống CRM SPĐ, không lưu raw refresh trong DB. */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDays(value: string): number {
    const match = /^(\d+)d$/i.exec(value.trim());
    return match ? Number(match[1]) : 7;
  }

  private async toAuthUser(staff: Pick<Staff, 'id' | 'email' | 'fullName' | 'role'>): Promise<AuthUser> {
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
