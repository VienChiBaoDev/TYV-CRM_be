import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from './auth-cookie';
import { IS_PUBLIC_KEY } from './public.decorator';
import type { PermissionCode } from './permissions';

export interface JwtPayloadUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  permissions?: PermissionCode[];
}

/** Guard toàn cục: yêu cầu JWT hợp lệ (HttpOnly cookie) cho mọi route trừ @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}
  /** Kiểm tra quyền truy cập của user với token. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    /** Kiểm tra route có public không. */
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; /** Nếu route public, trả về true. */
    /** Lấy request từ context. */
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      /** Nếu không có token, throw exception. */
      throw new UnauthorizedException('Chưa đăng nhập');
    }

    try {
      /** Kiểm tra token hợp lệ. */
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
      });
      /** Lưu payload vào request. */
      (request as Request & { user: JwtPayloadUser }).user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        permissions: payload.permissions,
      };
    } catch {
      /** Nếu token không hợp lệ, throw exception. */
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    }
    return true; /** Nếu token hợp lệ, trả về true. */
  }

  /** Lấy token từ HttpOnly cookie. */
  private extractToken(request: Request): string | undefined {
    const token = request.cookies?.[AUTH_COOKIE_NAME];
    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }
}
