import type { CookieOptions } from 'express';

/** Tên cookie JWT — dùng chung giữa controller và guard. */
export const AUTH_COOKIE_NAME = 'access_token';

/** 7 ngày — khớp JWT_EXPIRES_IN mặc định. */
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function baseCookieOptions(): Pick<CookieOptions, 'httpOnly' | 'secure' | 'sameSite' | 'path'> {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    // Cross-origin prod (Cloud Run): None + Secure. Dev localhost: Lax.
    sameSite: production ? 'none' : 'lax',
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
