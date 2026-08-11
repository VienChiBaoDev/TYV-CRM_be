import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from '../cookie/cookie.constants';
import { IS_PUBLIC_KEY } from '../decorators';
import type { JwtPayloadUser } from '../types';

/** Guard toàn cục: JWT từ HttpOnly cookie (hoặc Bearer) trừ @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      });
      (request as Request & { user: JwtPayloadUser }).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        permissions: payload.permissions,
      };
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }

  /** Ưu tiên cookie; fallback Authorization Bearer (Safari / client không giữ cross-site cookie). */
  private extractToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[AUTH_COOKIE_NAME];
    if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;

    const header = request.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      const bearer = header.slice(7).trim();
      if (bearer.length > 0) return bearer;
    }
    return undefined;
  }
}
