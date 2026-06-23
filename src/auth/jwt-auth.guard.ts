import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_SESSION_COOKIE } from './auth.constants';

export type JwtUserPayload = { sub: string; email: string; appRole: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { cookies?: Record<string, string>; user?: JwtUserPayload }
    >();
    const header = req.headers.authorization;
    const fromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const fromCookie = req.cookies?.[AUTH_SESSION_COOKIE];
    const fromQuery = req.query?.token as string | undefined;
    const token = fromHeader || fromCookie || fromQuery;
    if (!token) {
      throw new UnauthorizedException('Thiếu token');
    }
    try {
      const payload = this.jwt.verify<JwtUserPayload>(token);
      if (!payload.sub || !payload.email || !payload.appRole) {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
    }
  }
}
