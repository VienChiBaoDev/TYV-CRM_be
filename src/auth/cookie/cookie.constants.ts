/** Access JWT — HttpOnly. */
export const AUTH_COOKIE_NAME = 'access_token';

/** Refresh raw token — HttpOnly, path hẹp /api/auth. */
export const REFRESH_COOKIE_NAME = 'refresh_token';

/** CSRF double-submit — không HttpOnly. */
export const CSRF_COOKIE_NAME = 'tyv_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Path cookie refresh (same-site qua Vite/Vercel /api proxy). */
export const REFRESH_COOKIE_PATH = '/api/auth';
