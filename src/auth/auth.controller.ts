import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CookieAuthService } from './cookie/cookie-auth.service';
import { CurrentUser, Public } from './decorators';
import { LoginDto } from './dto/login.dto';
import type { JwtPayloadUser } from './types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: CookieAuthService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto);
    this.cookies.setAuthCookie(res, accessToken);
    // Trả accessToken trong body để FE fallback Bearer khi Safari chặn cross-site cookie.
    return { user, accessToken };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.cookies.clearAuthCookie(res);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    const authUser = await this.authService.me(user.id);
    const accessToken = await this.authService.issueAccessToken(authUser);
    this.cookies.setAuthCookie(res, accessToken);
    return authUser;
  }
}
