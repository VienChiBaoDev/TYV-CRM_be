import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from './cookie.constants';

/**
 * Cookie auth theo pattern CRM SPĐ:
 * - Same-site (Vite/Vercel proxy → BE): SameSite=Lax — Safari ổn.
 * - Cross-site (Vercel ↔ Railway trực tiếp): SameSite=None; Secure; Partitioned (CHIPS) — Safari ITP.
 */
@Injectable()
export class CookieAuthService {
  constructor(private readonly config: ConfigService) {}

  setAuthCookie(res: Response, accessToken: string): void {
    res.cookie(AUTH_COOKIE_NAME, accessToken, this.cookieOptions());
  }

  clearAuthCookie(res: Response): void {
    const { maxAge: _maxAge, ...options } = this.cookieOptions();
    res.clearCookie(AUTH_COOKIE_NAME, options);
  }

  private cookieOptions(): CookieOptions {
    const production = this.config.get<string>('NODE_ENV') === 'production';
    const secure = this.envBool('COOKIE_SECURE', production);
    const sameSite = this.envSameSite(production ? 'none' : 'lax');

    // SameSite=None bắt buộc Secure; thêm Partitioned để Safari không chặn cross-site cookie.
    const effectiveSecure = sameSite === 'none' ? true : secure;

    const options: CookieOptions = {
      httpOnly: true,
      secure: effectiveSecure,
      sameSite,
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    };

    if (sameSite === 'none') {
      // Express CookieOptions chưa luôn có `partitioned` trong type — cast an toàn.
      (options as CookieOptions & { partitioned?: boolean }).partitioned = true;
    }

    return options;
  }

  private envBool(name: string, fallback: boolean): boolean {
    const value = this.config.get<string>(name);
    if (value === undefined) return fallback;
    return value === 'true' || value === '1';
  }

  private envSameSite(fallback: 'lax' | 'strict' | 'none'): 'lax' | 'strict' | 'none' {
    const value = this.config.get<string>('COOKIE_SAME_SITE')?.toLowerCase();
    if (value === 'lax' || value === 'strict' || value === 'none') return value;
    return fallback;
  }
}
