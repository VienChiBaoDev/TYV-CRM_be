import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CookieAuthService } from './cookie/cookie-auth.service';
import { REFRESH_COOKIE_NAME } from './cookie/cookie.constants';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import type { JwtPayloadUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: CookieAuthService,
  ) {}

  /** Email + mật khẩu → HttpOnly cookies (không trả token trong JSON). */
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return { user: result.user };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await this.authService.refresh(refreshToken ?? '');
    this.cookies.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return { user: result.user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await this.authService.logout(refreshToken);
    this.cookies.clearAuthCookies(res);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.me(user.id);
  }
}
