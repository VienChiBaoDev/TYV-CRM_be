import { createHash } from 'node:crypto';

/** UUID deterministic từ chuỗi (ổn định qua các lần đăng nhập) — dùng cho departmentId/teamIds khi chưa có UUID thật. */
export function uuidFromSeed(seed: string): string {
  const h = createHash('sha256').update(seed, 'utf8').digest();
  const b = Buffer.alloc(16);
  h.copy(b, 0, 0, 16);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
