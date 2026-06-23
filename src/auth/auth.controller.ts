import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AUTH_SESSION_COOKIE, OAUTH_STATE_COOKIE } from './auth.constants';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Cookie `Secure` theo HTTPS thực tế — tránh mất session khi chạy `NODE_ENV=production`
   * trên HTTP local/staging (trình duyệt từ chối Set-Cookie nếu Secure nhưng không có TLS).
   * Ghi đè: `COOKIE_SECURE=true|false`.
   */
  private sessionCookieBase() {
    const override = this.config.get<string>('COOKIE_SECURE')?.trim().toLowerCase();
    let secure: boolean;
    if (override === 'true' || override === '1') {
      secure = true;
    } else if (override === 'false' || override === '0') {
      secure = false;
    } else {
      const fe = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
      secure = fe.trim().toLowerCase().startsWith('https://');
    }
    return {
      httpOnly: true,
      secure,
      sameSite: (secure ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    };
  }

  private sessionMaxAgeMs(): number {
    const sec = Number(
      this.config.get<string>('JWT_EXPIRES_SEC', String(7 * 24 * 60 * 60)),
    );
    return (Number.isFinite(sec) && sec > 0 ? sec : 7 * 24 * 60 * 60) * 1000;
  }

  /** Bước 1: redirect sang Google OAuth. */
  @Get('google')
  googleStart(@Res() res: Response) {
    const state = this.authService.createOAuthState();
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.sessionCookieBase(),
      maxAge: 10 * 60 * 1000,
    });
    const url = this.authService.getGoogleAuthorizeUrl(state);
    return res.redirect(302, url);
  }

  /** Bước 2: Google redirect về đây — đổi code, set cookie session, redirect về FE. */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res() res: Response,
  ) {
    const feBase = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');

    const expected = req.cookies?.[OAUTH_STATE_COOKIE];
    res.clearCookie(OAUTH_STATE_COOKIE, this.sessionCookieBase());

    if (!code || !state || !expected || state !== expected) {
      const q = new URLSearchParams({
        oauth: 'error',
        msg:
          !code
            ? 'Thiếu mã OAuth từ Google.'
            : !expected
              ? 'Hết phiên OAuth (cookie state). Thử đăng nhập lại; kiểm tra chặn cookie / HTTP+Secure.'
              : 'State OAuth không khớp (CSRF hoặc nhiều tab). Thử lại.',
      });
      return res.redirect(302, `${feBase}/login?${q.toString()}`);
    }

    try {
      const { accessToken } = await this.authService.completeGoogleOAuth(code);
      res.cookie(AUTH_SESSION_COOKIE, accessToken, {
        ...this.sessionCookieBase(),
        maxAge: this.sessionMaxAgeMs(),
      });
      const okUrl = `${feBase}/login?oauth=success&token=${accessToken}`;
      return res.redirect(302, okUrl);
    } catch (e) {
      let msg = 'Đăng nhập Google thất bại.';
      if (e instanceof HttpException) {
        const r = e.getResponse();
        const m =
          typeof r === 'string' ? r : (r as { message?: string | string[] }).message;
        if (Array.isArray(m)) msg = m.join(', ');
        else if (typeof m === 'string' && m.trim()) msg = m.trim();
      } else if (e instanceof Error && e.message) {
        msg = e.message;
      }
      const q = new URLSearchParams({
        oauth: 'error',
        msg: msg.slice(0, 350),
      });
      return res.redirect(302, `${feBase}/login?${q.toString()}`);
    }
  }

  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    return this.authService.login(body);
  }

  @Post('logout')
  logout(@Res() res: Response) {
    res.clearCookie(AUTH_SESSION_COOKIE, this.sessionCookieBase());
    return res.json({ ok: true });
  }

  /**
   * Kiểm tra phiên — luôn 200: `{ user: null }` khi chưa đăng nhập (tránh 401 trên trang /, /login).
   */
  @Get('me')
  async me(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Headers('authorization') authorization?: string,
  ) {
    const bearer =
      authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
    const cookieJwt = req.cookies?.[AUTH_SESSION_COOKIE];
    const token = bearer || cookieJwt;
    const session = await this.authService.tryMeFromToken(token);
    if (!session) {
      return { user: null, accessToken: null };
    }
    return session;
  }
}
