import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import type { JwtPayloadUser } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

/** Guard toàn cục: chỉ chặn khi route có gắn @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayloadUser }>();
    if (!user || !required.includes(user.role as StaffRole)) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
    return true;
  }
}
