import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type User } from '@prisma/client';
import { roleFromContractType, type AppRole } from '../auth/contract-type-to-role';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeEmailForAuth } from '../common/normalize-email';

export type StaffLevel = 'PROBATION' | 'PROFICIENT' | 'GENERAL' | 'UNKNOWN';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByIdWithProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { appProfile: true },
    });
  }

  async findTeamName(teamId: string | null): Promise<string | null> {
    if (!teamId) return null;
    const t = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });
    return t?.name || null;
  }


  /**
   * Tìm user theo email (OAuth Google ↔ Excel).
   * So khớp không phân biệt hoa thường; với Gmail/Googlemail còn chuẩn hóa bỏ dấu chấm ở phần local
   * vì Google coi tương đương nhưng chuỗi trong DB có thể khác.
   */
  async findByEmailIgnoreCase(email: string): Promise<User | null> {
    const raw = (email ?? '').trim();
    if (!raw) return null;
    const n = normalizeEmailForAuth(raw);
    if (!n) return null;

    // 1. Exact match (case-insensitive) — sử dụng index trên email
    const exactNorm = await this.prisma.user.findFirst({
      where: { email: { equals: n, mode: 'insensitive' } },
    });
    if (exactNorm) return exactNorm;

    // 2. Try with raw email
    const exactRaw = await this.prisma.user.findFirst({
      where: { email: { equals: raw, mode: 'insensitive' } },
    });
    if (exactRaw && normalizeEmailForAuth(exactRaw.email ?? '') === n) return exactRaw;

    // 3. Gmail fallback — tìm theo local part (KHÔNG tải 5000 user nữa)
    if (!n.endsWith('@gmail.com')) return null;
    const localPart = n.split('@')[0].replace(/\./g, ''); // bỏ dấu chấm Gmail
    // Tìm chính xác theo local part đã chuẩn hoá, giới hạn 20 kết quả
    const candidates = await this.prisma.user.findMany({
      where: {
        OR: [
          { email: { endsWith: '@gmail.com', mode: 'insensitive' } },
          { email: { endsWith: '@googlemail.com', mode: 'insensitive' } },
        ],
        email: { contains: localPart.substring(0, 5), mode: 'insensitive' }, // Lọc sơ bộ trước
      },
      take: 50,
    });
    return candidates.find((u) => normalizeEmailForAuth(u.email ?? '') === n) ?? null;
  }

  async findByIdWithProfileByEmail(email: string) {
    /** Phải cùng logic `findByEmailIgnoreCase` — Gmail trong DB có dấu chấm, OAuth chuẩn hoá sang local không chấm. */
    const found = await this.findByEmailIgnoreCase(email);
    if (!found) return null;

    return this.prisma.user.findUnique({
      where: { id: found.id },
      include: { appProfile: true },
    });
  }

  /** Ưu tiên `role_email_overrides`, sau đó stored `role` field (nếu là MANAGER/LEADER/HR/BOD), rồi check isTeacher, cuối cùng `jobTitle` mapping. */
  async resolveAppRole(
    canonicalEmail: string,
    user: (Pick<User, 'jobTitle' | 'id'> & { role?: any }) | null,
    /** Nếu đã biết isTeacher từ trước (ví dụ Promise.all), truyền vào để tránh query trùng lặp */
    isTeacherHint?: boolean,
  ): Promise<AppRole> {
    // 1. Check email overrides (highest priority — HR/Manager có thể gán role qua Perms page)
    const row = await this.prisma.roleEmailOverride.findUnique({
      where: { email: normalizeEmailForAuth(canonicalEmail) },
    });
    if (row) return row.role as AppRole;

    // 2. Check DB stored role FIRST (if explicitly set to MANAGER, LEADER, HR, BOD)
    // This ensures explicit role assignments take priority
    if (user && user.role && user.role !== 'MEMBER') {
      return user.role as AppRole;
    }

    // 3. If user is assigned to any class and doesn't have explicit role, treat as TEACHER
    if (user?.id) {
      const isTeacher = isTeacherHint ?? await this.isAssignedLearningClassTeacher(user.id);
      if (isTeacher) return 'TEACHER';
    }

    // 4. Fallback to jobTitle mapping
    return roleFromContractType(user?.jobTitle);
  }

  /** Đang là giáo viên phụ trách ít nhất một lớp — gộp quyền TEACHER, không đổi role chính từ contract/override. */
  async isAssignedLearningClassTeacher(userId: string): Promise<boolean> {
    const n = await this.prisma.learningClass.count({
      where: {
        OR: [
          { teacherUserId: userId },
          { schedules: { some: { examTeacherUserId: userId, isExam: true } } },
        ],
      },
    });
    return n > 0;
  }

  /**
   * Xác định cấp độ nhân sự theo các bảng phân loại.
   * Thứ tự ưu tiên: GENERAL -> PROFICIENT -> PROBATION -> UNKNOWN.
   */
  async resolveStaffLevel(userId: string): Promise<StaffLevel> {
    try {
      const [general, proficient, probation] = await Promise.all([
        this.prisma.staffGeneral.findUnique({ where: { userId }, select: { userId: true } }),
        this.prisma.staffProficient.findUnique({ where: { userId }, select: { userId: true } }),
        this.prisma.staffProbation.findUnique({ where: { userId }, select: { userId: true } }),
      ]);

      if (general) return 'GENERAL';
      if (proficient) return 'PROFICIENT';
      if (probation) return 'PROBATION';
      return 'UNKNOWN';
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2021') {
        return 'UNKNOWN';
      }
      throw e;
    }
  }
}
