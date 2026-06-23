/** Khớp với `Role` trên FE — map từ cột `contract_type` (CSV/Bitable có thể là “Vị trí” / loại HĐ / mã role). */
/** LEADER — nhãn UI: Leader (trưởng nhóm KPI/OKR). */
export type AppRole = 'MEMBER' | 'LEADER' | 'MANAGER' | 'HR' | 'TEACHER' | 'BOD';

const EXACT: Record<string, AppRole> = {
  MEMBER: 'MEMBER',
  LEADER: 'LEADER',
  MANAGER: 'MANAGER',
  HR: 'HR',
  /** Alias từ dữ liệu / import cũ. */
  HR_ADMIN: 'HR',
  TEACHER: 'TEACHER',
  BOD: 'BOD',
};

/** Bỏ dấu + lowercase để so khớp từ khoá tiếng Việt. */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

export function roleFromContractType(raw: string | null | undefined): AppRole {
  const t = (raw ?? '').trim();
  if (!t) return 'MEMBER';
  const upper = t.toUpperCase();
  if (EXACT[upper]) return EXACT[upper];

  const s = fold(t);

  // Gộp BOD vào Manager theo yêu cầu
  if (/\bbod\b|ban lanh dao|hoi dong quan tri|ban giam doc|tong giam doc\b|ceo\b|cto\b|cfo\b/.test(s))
    return 'MANAGER';
  
  if (/(^|[^a-z])hr($|[^a-z])|human resource|nhan su|phong nhan su|phong hr|hanh chinh/.test(s))
    return 'HR';
  
  if (
    /giao vien|giang vien|cham thi|giam thi|dao tao|trainer|exam|thi\b|nguoi cham|tro giang/.test(s)
  )
    return 'TEACHER';
  
  if (/quan ly|truong bp|giam sat|manager|chuyen gia cap cao/.test(s))
    return 'MANAGER';
  
  if (/truong nhom|leader|doi nhom|to truong/.test(s))
    return 'LEADER';

  return 'MEMBER';
}
