function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Khớp logic ngưng hoạt động nhân sự (employees.service employmentStatusToApiStatus). */
export function isEmploymentInactive(raw: string | null | undefined): boolean {
  const t = (raw ?? '').trim();
  if (!t) return false;
  const u = t.toUpperCase();
  if (u === 'INACTIVE' || u === 'TERMINATED') return true;
  const s = fold(t);
  return /thoi viec|nghi viec|da nghi|inactive|ngung hoat dong|sa thai/.test(s);
}
