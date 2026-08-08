import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import type { JwtPayloadUser } from './jwt-auth.guard';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { PermissionCode } from './permissions';
import { PermissionsService } from './permissions.service';

/** Global guard: only enforces when route has @RequirePermissions(...). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayloadUser }>();
    if (!user) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
    if (user.role === StaffRole.ADMIN) return true;

    const codes =
      user.permissions ??
      (await this.permissionsService.getForStaff(user.id, user.role as StaffRole));

    const owned = new Set(codes);
    if (!required.every((code) => owned.has(code))) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
    return true;
  }
}
