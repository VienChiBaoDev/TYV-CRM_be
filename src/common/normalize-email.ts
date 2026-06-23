/**
 * Chuẩn hóa email để khớp OAuth Google ↔ dữ liệu import (Excel/Lark).
 * - trim, lowercase, NFC
 * - bỏ ký tự zero-width
 * - Gmail / Googlemail: bỏ dấu chấm trong phần local, domain về gmail.com
 */
export function normalizeEmailForAuth(raw: string | null | undefined): string {
  if (raw == null) return '';
  let e = String(raw).normalize('NFC').trim().toLowerCase();
  e = e.replace(/[\u200B-\u200D\uFEFF]/g, '');
  const m = /^([^@]+)@(gmail\.com|googlemail\.com)$/i.exec(e);
  if (m) {
    const local = m[1].replace(/\./g, '');
    e = `${local}@gmail.com`;
  }
  return e;
}
