import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { CookieOptions, Response } from 'express';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_CLEAR_PATHS,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
} from './cookie.constants';

/**
 * Cookie auth theo CRM SPĐ (same-site qua FE /api proxy):
 * - access + refresh: HttpOnly + SameSite=Lax
 * - csrf: readable, double-submit
 * Prod Safari: bắt buộc VITE_API_URL=/api (không phải https://railway.../api).
 */
@Injectable()
export class CookieAuthService {
  constructor(private readonly config: ConfigService) {}

  setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    const secure = this.isSecure();
    const accessMaxAge = this.parseDurationMs(
      this.config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
    );
    const refreshMaxAge = this.parseDurationMs(
      this.config.get<string>('JWT_REFRESH_EXPIRES') ?? '7d',
    );
    const csrf = randomBytes(32).toString('hex');
    const refreshPath = this.refreshPath();

    res.cookie(AUTH_COOKIE_NAME, tokens.accessToken, {
      ...this.baseOptions(secure),
      maxAge: accessMaxAge,
    });

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.baseOptions(secure),
      maxAge: refreshMaxAge,
      path: refreshPath,
    });

    res.cookie(CSRF_COOKIE_NAME, csrf, {
      httpOnly: false,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    const secure = this.isSecure();
    const base: CookieOptions = { sameSite: 'lax', secure };

    res.clearCookie(AUTH_COOKIE_NAME, { ...base, path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { ...base, path: '/' });

    // Clear refresh trên mọi path từng dùng (tránh sót cookie khi đổi /api ↔ direct Railway).
    for (const path of REFRESH_COOKIE_CLEAR_PATHS) {
      res.clearCookie(REFRESH_COOKIE_NAME, { ...base, path });
    }
  }

  private refreshPath(): string {
    return this.config.get<string>('COOKIE_REFRESH_PATH')?.trim() || REFRESH_COOKIE_PATH;
  }

  private baseOptions(secure: boolean): CookieOptions {
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    };
  }

  private isSecure(): boolean {
    const value = this.config.get<string>('COOKIE_SECURE');
    if (value !== undefined) return value === 'true' || value === '1';
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private parseDurationMs(value: string): number {
    const v = value.trim().toLowerCase();
    const m = /^(\d+)([smhd])$/.exec(v);
    if (!m) return 15 * 60 * 1000;
    const n = Number(m[1]);
    const unit = m[2];
    const mult =
      unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
    return n * mult;
  }
}
