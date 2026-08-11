import type { CookieOptions } from 'express';

/** Tên cookie JWT — dùng chung giữa controller và guard. */
export const AUTH_COOKIE_NAME = 'access_token';

/** 7 ngày — khớp JWT_EXPIRES_IN mặc định. */
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function envBool(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function envSameSite(fallback: 'lax' | 'strict' | 'none'): 'lax' | 'strict' | 'none' {
  const value = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (value === 'lax' || value === 'strict' || value === 'none') return value;
  return fallback;
}

function baseCookieOptions(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path'> {
  const production = process.env.NODE_ENV === 'production';
  const secure = envBool('COOKIE_SECURE', production);
  const sameSite = envSameSite(production ? 'none' : 'lax');

  return {
    httpOnly: true,
    secure,
    // Cross-origin prod (Railway/Vercel): COOKIE_SECURE=true + COOKIE_SAME_SITE=none
    sameSite,
    path: '/',
  };
}

export function authCookieOptions(): CookieOptions {
  return {
    ...baseCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function clearAuthCookieOptions(): CookieOptions {
  return baseCookieOptions();
}
