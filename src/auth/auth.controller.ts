import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME, authCookieOptions, clearAuthCookieOptions } from './auth-cookie';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import type { JwtPayloadUser } from './jwt-auth.guard';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.login(dto);
    // Thêm header Set-Cookie vào response để trình duyệt lưu access token.
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return { user };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions());
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    const authUser = await this.authService.me(user.id);
    const accessToken = await this.authService.issueAccessToken(authUser);
    res.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions());
    return authUser;
  }
}
