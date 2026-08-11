import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER } from '../cookie/cookie.constants';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/** Double-submit CSRF — giống CRM SPĐ. Bỏ qua GET/HEAD/OPTIONS và login. */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return true;
    }

    const path = req.path || '';
    // Login chưa có CSRF; logout chỉ cần clear cookie — CSRF fail không nên chặn đăng xuất.
    if (path.endsWith('/auth/login') || path.endsWith('/auth/logout')) {
      return true;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerToken = headerValue(req, CSRF_HEADER);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token không hợp lệ');
    }

    return true;
  }
}
