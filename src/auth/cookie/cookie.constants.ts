/** Tên cookie JWT — dùng chung giữa cookie service và guard. */
export const AUTH_COOKIE_NAME = 'access_token';

/** 7 ngày — khớp JWT_EXPIRES_IN mặc định. */
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
