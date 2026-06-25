import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayloadUser } from './jwt-auth.guard';

/** Lấy thông tin user đã xác thực từ request (do JwtAuthGuard gắn vào). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: JwtPayloadUser }>();
    return request.user;
  },
);
