/** Access JWT — HttpOnly. */
export const AUTH_COOKIE_NAME = 'access_token';

/** Refresh raw token — HttpOnly. */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/** CSRF double-submit — không HttpOnly. */
export const CSRF_COOKIE_NAME = 'tyv_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Path refresh cookie trên **browser URL** (sau Vite/Vercel proxy).
 * FE dùng VITE_API_URL=/api → request là /api/auth/* → path phải là /api/auth.
 * Không gắn /api vào URL Railway (BE vẫn là /auth/login).
 */
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Các path cũ / lệch config — clear hết lúc logout để không sót cookie. */
export const REFRESH_COOKIE_CLEAR_PATHS = ['/api/auth', '/auth', '/api', '/'] as const;
